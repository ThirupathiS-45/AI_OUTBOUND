from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import os
import math

from app.model import model
from app.schemas import (
    LeadInput, LeadScoreResponse, EmailInput, SendEmailInput, SendEmailResponse, UseCase,
    SegmentationResponse, CampaignCreate, Campaign, EnhancedLead
)
from app.utils import generate_email_llama2, calculate_lead_score
from app.email_sender import send_sales_email
from app.segmentation import enrich_lead_data, resegment_all_leads
from app.use_cases import get_all_use_cases, get_use_case_by_id, match_use_case
from app.crm_integration import get_crm_client
from app.database import db
from typing import List
from datetime import datetime

# Import automation scheduler
from app.scheduler import automation_scheduler

# toggle for CRM integration
USE_CRM = os.getenv("USE_CRM", "false").lower() == "true"
crm_client = get_crm_client(use_mock=False) if USE_CRM else None


def sanitize_json_data(obj):
    """
    Recursively sanitize data to ensure JSON compliance.
    Converts inf, -inf, and NaN to None.
    """
    if isinstance(obj, dict):
        return {k: sanitize_json_data(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_json_data(item) for item in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    return obj


app = FastAPI(title="AI-Based Outbound Sales Backend")

@app.on_event("startup")
async def startup_db_client():
    db.connect()
    # Start automation scheduler for monthly segmentation and campaigns
    automation_scheduler.start()

@app.on_event("shutdown")
async def shutdown_db_client():
    db.close()
    automation_scheduler.stop()

# Add CORS middleware to allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://sales-crm-frontend.onrender.com",  # Render production
        os.getenv("FRONTEND_URL", "")  # Dynamic frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load scored leads CSV
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "data", "scored_leads.csv")

df = pd.read_csv(DATA_PATH)


@app.get("/")
def root():
    return {"message": "AI Outbound Sales Backend is running 🚀"}


@app.get("/health")
def health_check():
    return {"status": "OK"}


@app.get("/leads")
async def get_leads():
    print("DEBUG: /leads endpoint called")
    records = []

    # 1. Try to fetch from MongoDB first
    try:
        if db.db is not None:
             mongo_leads = await db.get_all_leads()
             if mongo_leads:
                 print(f"DEBUG: Found {len(mongo_leads)} leads in Mongo")
                 for lead in mongo_leads:
                     if "_id" in lead: lead["_id"] = str(lead["_id"])
                 records = mongo_leads
    except Exception as e:
        print(f"⚠️ MongoDB fetch error: {e}")

    # 2. If no leads in DB, try fetching from CRM or CSV
    if not records:
        print("DEBUG: No Mongo records found. Checking CRM/CSV...")
        if USE_CRM and crm_client and crm_client.connect():
            print("DEBUG: Fetching leads from CRM...")
            records = crm_client.fetch_leads(limit=50)
            if db.db is not None:
                for r in records:
                    await db.save_lead(r)
        else:
            # Fallback to CSV
            print("DEBUG: Loading fallback CSV...")
            leads_df = df.head(50).copy()
            leads_df = leads_df.rename(columns={"customer_name": "company_name"})
            leads_df = leads_df.replace([np.inf, -np.inf], None)
            leads_df = leads_df.where(pd.notna(leads_df), None)
            records = leads_df.to_dict(orient="records")
            
            # Sync to Mongo
            if db.db is not None:
                print(f"DEBUG: Syncing {len(records)} CSV leads to Mongo...")
                for r in records:
                    if "email" not in r or not r["email"]:
                        clean_name = str(r["company_name"]).replace(" ", "").lower()
                        r["email"] = f"contact@{clean_name}.com"
                    try:
                         await db.save_lead(r)
                    except Exception as e:
                        print(f"Failed to save CSV lead: {e}")

    # Enrich each record with segmentation data
    enriched_leads = []
    print(f"DEBUG: Enriching {len(records)} records")
    for record in records:
        try:
            enriched = enrich_lead_data(record)
            enriched_leads.append(enriched)
        except Exception as e:
            enriched_leads.append(record)
    
    # Sanitize data to ensure JSON compliance
    sanitized_leads = sanitize_json_data(enriched_leads)
            
    print(f"DEBUG: Returning {len(sanitized_leads)} leads to frontend")
    return sanitized_leads


@app.get("/use-cases", response_model=list[UseCase])
def get_use_cases():
    """Get all available success stories and use cases"""
    return get_all_use_cases()


@app.post("/match-use-case")
def find_best_use_case(lead: LeadInput):
    """Find the best use case based on lead parameters"""
    from app.segmentation import determine_maturity, assign_segment, determine_industry
    
    # Infer profile from input data
    industry = determine_industry(lead.company_name)
    maturity = determine_maturity(lead.quote_value, lead.item_count)
    segment = assign_segment(industry, maturity)
    
    # Find match
    use_case = match_use_case(industry, segment)
    
    # Write back to CRM if enabled and ID is present (mock or real)
    if USE_CRM and crm_client and lead.id:
        # We don't have lead score here, so pass 0 or maybe remove that arg from update_lead_ai_data
        # Actually update_lead_ai_data expects lead_id, lead_score, use_case
        # Let's pass a placeholder or modify the method. For now, 0.0 is fine as placeholder.
        crm_client.update_lead_ai_data(lead.id, lead_score=0.0, use_case=use_case.title)

    return {
        "recommended_use_case": use_case,
        "segment_assigned": segment,
        "maturity_level": maturity,
        "industry_detected": industry
    }


@app.post("/predict", response_model=LeadScoreResponse)
def predict_lead(lead: LeadInput):
    X = [[
        lead.quote_value,
        lead.item_count,
        lead.conversion_days
    ]]

    score, prob = calculate_lead_score(model, X)

    return {
        "lead_score": score,
        "conversion_probability": prob
    }


@app.post("/generate-email-llama2")
def generate_email_llm(data: EmailInput):

    email = generate_email_llama2(
        customer_name=data.customer_name,
        lead_score=data.lead_score,
        quote_value=data.quote_value,
        item_count=data.item_count,
        use_case_id=data.use_case_id,
        customer_email=data.customer_email
    )

    return {
        "email_body": email,
        "use_case_applied": data.use_case_id
    }


@app.post("/send-email", response_model=SendEmailResponse)
def send_email_endpoint(data: SendEmailInput):
    """
    Generate AI-powered email and send it to the customer
    """
    result = send_sales_email(
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        lead_score=data.lead_score,
        quote_value=data.quote_value,
        item_count=data.item_count,
        subject=data.subject
    )
    
    return result


# ==========================================
# NEW ENDPOINTS FOR PROBLEM STATEMENT ALIGNMENT
# ==========================================

@app.post("/leads/upload")
async def bulk_upload_leads(leads: List[dict]):
    """
    Bulk upload leads from external system (CRM, CSV, API)
    Enables live data ingestion as per problem statement
    """
    uploaded_count = 0
    failed = []
    
    for lead in leads:
        try:
            # Enrich and segment the lead
            enriched_lead = enrich_lead_data(lead)
            enriched_lead['last_segmented_at'] = datetime.now().isoformat()
            
            # Save to MongoDB
            await db.save_lead(enriched_lead)
            uploaded_count += 1
        except Exception as e:
            failed.append({"lead": lead.get("company_name", "Unknown"), "error": str(e)})
    
    return {
        "success": True,
        "uploaded": uploaded_count,
        "failed": len(failed),
        "errors": failed[:5]  # Show first 5 errors
    }


@app.post("/segmentation/run", response_model=SegmentationResponse)
async def run_segmentation(force_resegment: bool = False):
    """
    Monthly automated customer segmentation based on:
    - Industry
    - Maturity level
    - Past engagements
    - Job role (decision-maker identification)
    """
    all_leads = await db.get_all_leads()
    
    if not all_leads:
        return {
            "segments_updated": 0,
            "segment_distribution": {}
        }
    
    # Re-segment all leads
    segment_counts = {}
    updated = 0
    
    for lead in all_leads:
        try:
            # Only re-segment if forced or never segmented
            should_segment = force_resegment or not lead.get("last_segmented_at")
            
            if should_segment:
                enriched = enrich_lead_data(lead)
                enriched['last_segmented_at'] = datetime.now().isoformat()
                await db.save_lead(enriched)
                updated += 1
                
                segment = enriched.get("segment", "GENERAL")
                segment_counts[segment] = segment_counts.get(segment, 0) + 1
        except Exception as e:
            print(f"Segmentation error for {lead.get('company_name')}: {e}")
    
    return {
        "segments_updated": updated,
        "segment_distribution": segment_counts
    }


@app.post("/campaigns/create")
async def create_email_campaign(campaign: CampaignCreate):
    """
    Create scheduled email campaign with throttling
    Supports: Onboarding, Nurture, Cross-sell, Upsell campaigns
    """
    # Fetch leads matching target segment
    all_leads = await db.get_all_leads()
    target_leads = [
        lead for lead in all_leads 
        if lead.get("segment") == campaign.target_segment
    ]
    
    campaign_doc = {
        "name": campaign.name,
        "campaign_type": campaign.campaign_type,
        "target_segment": campaign.target_segment,
        "use_case_id": campaign.use_case_id,
        "emails_scheduled": len(target_leads),
        "emails_sent": 0,
        "throttle_rate": campaign.throttle_rate,
        "send_time": campaign.send_time,
        "status": "scheduled",
        "created_at": datetime.now().isoformat(),
        "target_leads": [lead.get("email") for lead in target_leads]
    }
    
    # Save campaign to database
    await db.save_campaign(campaign_doc)
    
    return {
        "success": True,
        "campaign_id": campaign_doc.get("_id", "pending"),
        "leads_targeted": len(target_leads),
        "throttle_rate": f"{campaign.throttle_rate} emails/min",
        "scheduled_for": campaign.send_time
    }


@app.get("/campaigns")
async def list_campaigns():
    """List all email campaigns"""
    campaigns = await db.get_all_campaigns()
    for campaign in campaigns:
        if "_id" in campaign:
            campaign["_id"] = str(campaign["_id"])
    return campaigns


@app.post("/crm/sync")
async def sync_crm_data():
    """
    Manual trigger for CRM data sync
    Fetches: customer data, industry, role, past engagements
    """
    if not USE_CRM or not crm_client:
        return {
            "success": False,
            "message": "CRM integration not enabled. Set USE_CRM=true in .env"
        }
    
    if not crm_client.connect():
        return {
            "success": False,
            "message": "Failed to connect to CRM"
        }
    
    # Fetch leads from CRM
    crm_leads = crm_client.fetch_leads(limit=500)
    
    # Save to MongoDB with enrichment
    synced = 0
    for lead in crm_leads:
        try:
            enriched = enrich_lead_data(lead)
            enriched['last_segmented_at'] = datetime.now().isoformat()
            await db.save_lead(enriched)
            synced += 1
        except Exception as e:
            print(f"CRM sync error: {e}")
    
    return {
        "success": True,
        "source": "CRM",
        "records_synced": synced,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/analytics/segments")
async def get_segment_analytics():
    """
    Analytics dashboard for segment distribution
    Used for cross-sell/upsell opportunity identification
    """
    all_leads = await db.get_all_leads()
    
    if not all_leads:
        return {"total_leads": 0, "segments": {}}
    
    # Calculate segment distribution
    segment_stats = {}
    for lead in all_leads:
        segment = lead.get("segment", "GENERAL")
        if segment not in segment_stats:
            segment_stats[segment] = {
                "count": 0,
                "total_revenue_potential": 0,
                "avg_lead_score": 0,
                "top_industries": {}
            }
        
        segment_stats[segment]["count"] += 1
        segment_stats[segment]["total_revenue_potential"] += lead.get("revenue_potential", 0)
        segment_stats[segment]["avg_lead_score"] += lead.get("lead_score", 0)
        
        industry = lead.get("industry", "OTHER")
        segment_stats[segment]["top_industries"][industry] = \
            segment_stats[segment]["top_industries"].get(industry, 0) + 1
    
    # Calculate averages
    for segment, stats in segment_stats.items():
        if stats["count"] > 0:
            stats["avg_lead_score"] = round(stats["avg_lead_score"] / stats["count"], 2)
            stats["avg_revenue_potential"] = round(
                stats["total_revenue_potential"] / stats["count"], 2
            )
    
    return {
        "total_leads": len(all_leads),
        "segments": segment_stats
    }


# ==========================================
# SCHEDULED EMAIL ENDPOINTS
# ==========================================

@app.post("/emails/schedule")
async def schedule_email(payload: dict):
    """
    Queue a single email to be sent at a specified time.
    Payload: customer_name, customer_email, subject, lead_score,
             quote_value, item_count, scheduled_at (ISO datetime string, UTC)
    """
    from datetime import datetime as dt
    from fastapi import HTTPException

    if "customer_email" not in payload or "scheduled_at" not in payload:
        raise HTTPException(status_code=400, detail="customer_email and scheduled_at are required")

    job = {
        "customer_name":  payload.get("customer_name", "Valued Customer"),
        "customer_email": payload["customer_email"],
        "subject":        payload.get("subject", "Exclusive IT Solutions for Your Business"),
        "lead_score":     payload.get("lead_score", 0),
        "quote_value":    payload.get("quote_value", 0),
        "item_count":     payload.get("item_count", 0),
        "scheduled_at":   payload["scheduled_at"],
        "status":         "pending",
        "created_at":     dt.utcnow().isoformat(),
        "sent_at":        None,
    }

    saved = await db.save_scheduled_email(job)
    return {"success": True, "job": saved}


@app.get("/emails/scheduled")
async def list_scheduled_emails():
    """Return all scheduled email jobs (any status)."""
    jobs = await db.get_scheduled_emails()
    return jobs


@app.delete("/emails/scheduled/{job_id}")
async def cancel_scheduled_email(job_id: str):
    """Cancel a pending scheduled email."""
    await db.update_scheduled_email_status(job_id, status="cancelled")
    return {"success": True, "message": f"Job {job_id} cancelled"}

@app.delete("/emails/scheduled/{job_id}/delete")
async def delete_scheduled_email(job_id: str):
    """Hard delete a scheduled email job from the database."""
    await db.delete_scheduled_email(job_id)
    return {"success": True, "message": f"Job {job_id} completely removed"}


@app.post("/emails/scheduled/{job_id}/send-now")
async def send_scheduled_email_now(job_id: str):
    """
    Immediately send a pending scheduled email, bypassing the scheduler timer.
    """
    from datetime import datetime as dt
    from fastapi import HTTPException
    from app.email_sender import send_sales_email as _send

    all_jobs = await db.get_scheduled_emails()
    job = next((j for j in all_jobs if j["_id"] == job_id), None)

    if not job:
        raise HTTPException(status_code=404, detail="Scheduled email not found")
    if job["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot send — job status is '{job['status']}'")

    send_result = _send(
        customer_name=job.get("customer_name", "Valued Customer"),
        customer_email=job["customer_email"],
        lead_score=job.get("lead_score", 0),
        quote_value=job.get("quote_value", 0),
        item_count=job.get("item_count", 0),
        subject=job.get("subject", "Exclusive IT Solutions for Your Business"),
    )

    new_status = "sent" if send_result.get("success") else "failed"
    await db.update_scheduled_email_status(
        job_id, status=new_status, sent_at=dt.utcnow().isoformat()
    )

    return {
        "success": send_result.get("success"),
        "message": send_result.get("message"),
        "status": new_status,
    }
