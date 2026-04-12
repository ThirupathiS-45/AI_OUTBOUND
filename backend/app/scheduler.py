"""
Automated Scheduler for Monthly Segmentation and Campaign Execution
Problem Statement Requirement: "AI segments customers monthly"
Uses MongoDB for persistent job storage to survive app restarts (critical for Render deployment)
"""
import asyncio
import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.mongodb import MongoDBJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from datetime import datetime
from app.database import db
from app.segmentation import enrich_lead_data
from app.email_sender import send_sales_email
from app.use_cases import match_use_case
from app.utils import generate_email_llama2, calculate_lead_score
from app.model import model
import time


class AutomationScheduler:
    """
    Handles automated tasks:
    1. Monthly customer segmentation
    2. Email campaign execution with throttling
    3. Scheduled individual email dispatch (every 1 minute)
    4. CRM data sync
    
    RENDER COMPATIBILITY: Uses MongoDB job store for persistent storage
    so scheduled jobs survive app restarts and deployments.
    """
    
    def __init__(self):
        # Get MongoDB URL from environment
        mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.getenv("DB_NAME", "ai_sales_db")
        
        # Configure job store to use MongoDB instead of in-memory
        # This ensures jobs persist across app restarts (critical for Render)
        jobstores = {
            'default': MongoDBJobStore(
                database=db_name,
                collection='scheduler_jobs',
                client=None,  # Will use pymongo.MongoClient with connection string
                url=mongo_url
            )
        }
        
        # Configure executors
        executors = {
            'default': AsyncIOExecutor()
        }
        
        # Configure job defaults
        job_defaults = {
            'coalesce': True,  # Only run one job if multiple are pending
            'max_instances': 1  # Only one instance of each job at a time
        }
        
        # Create AsyncIOScheduler with MongoDB job store
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='UTC'
        )
        
        self.is_running = False
    
    async def monthly_segmentation_job(self):
        """
        Run monthly re-segmentation of all customers.
        Identifies upsell/cross-sell opportunities.
        """
        print(f"\n🔄 Starting Monthly Segmentation Job at {datetime.now()}")
        
        try:
            all_leads = await db.get_all_leads()
            
            if not all_leads:
                print("⚠️ No leads found for segmentation")
                return
            
            updated_count = 0
            segment_changes = {}
            
            for lead in all_leads:
                try:
                    old_segment = lead.get("segment", "UNKNOWN")
                    
                    # Re-enrich and re-segment
                    enriched = enrich_lead_data(lead)
                    enriched['last_segmented_at'] = datetime.now().isoformat()
                    
                    new_segment = enriched.get("segment")
                    
                    # Track segment changes (upsell/cross-sell opportunities)
                    if old_segment != new_segment:
                        change_key = f"{old_segment} → {new_segment}"
                        segment_changes[change_key] = segment_changes.get(change_key, 0) + 1
                    
                    # Save updated lead
                    await db.save_lead(enriched)
                    updated_count += 1
                    
                except Exception as e:
                    print(f"Error segmenting {lead.get('company_name')}: {e}")
            
            print(f"✅ Monthly Segmentation Complete:")
            print(f"   - Total Leads Updated: {updated_count}")
            print(f"   - Segment Changes: {segment_changes}")
            
        except Exception as e:
            print(f"❌ Monthly Segmentation Failed: {e}")

    async def execute_scheduled_emails(self):
        """
        Poll the scheduled_emails collection every minute.
        Send any email whose scheduled_at time has passed and status is 'pending'.
        """
        try:
            pending = await db.get_pending_scheduled_emails()
            if not pending:
                return

            print(f"\n⏰ Scheduled Email Dispatcher: {len(pending)} email(s) due at {datetime.now()}")

            for job in pending:
                try:
                    result = send_sales_email(
                        customer_name=job.get("customer_name", "Valued Customer"),
                        customer_email=job["customer_email"],
                        lead_score=job.get("lead_score", 0),
                        quote_value=job.get("quote_value", 0),
                        item_count=job.get("item_count", 0),
                        subject=job.get("subject", "Exclusive IT Solutions for Your Business"),
                    )

                    new_status = "sent" if result.get("success") else "failed"
                    await db.update_scheduled_email_status(
                        job["_id"],
                        status=new_status,
                        sent_at=datetime.utcnow().isoformat()
                    )
                    print(f"  {'✅' if new_status == 'sent' else '❌'} {new_status.upper()}: {job['customer_email']}")

                except Exception as e:
                    print(f"  ❌ Error sending to {job.get('customer_email')}: {e}")
                    await db.update_scheduled_email_status(job["_id"], status="failed")

        except Exception as e:
            print(f"❌ Scheduled Email Dispatcher Failed: {e}")

    async def execute_scheduled_campaigns(self):
        """
        Execute scheduled email campaigns with throttling.
        Sends emails at configured rate to avoid spam.
        """
        print(f"\n📧 Checking for Scheduled Campaigns at {datetime.now()}")
        
        try:
            # Get all scheduled campaigns
            campaigns = await db.get_all_campaigns()
            scheduled = [c for c in campaigns if c.get("status") == "scheduled"]
            
            if not scheduled:
                print("No campaigns scheduled for execution")
                return
            
            for campaign in scheduled:
                try:
                    # Check if campaign should run now
                    send_time = campaign.get("send_time")
                    if send_time and datetime.fromisoformat(send_time) > datetime.now():
                        continue  # Not yet time
                    
                    print(f"🚀 Executing Campaign: {campaign['name']}")
                    
                    # Update status to active
                    await db.update_campaign_status(
                        str(campaign["_id"]), 
                        status="active"
                    )
                    
                    # Get target leads
                    target_emails = campaign.get("target_leads", [])
                    throttle_rate = campaign.get("throttle_rate", 10)  # emails per minute
                    delay = 60 / throttle_rate  # seconds between emails
                    
                    emails_sent = 0
                    
                    # Send emails with throttling
                    for email in target_emails[:50]:  # Limit to 50 per execution
                        try:
                            # Fetch lead data
                            all_leads = await db.get_all_leads()
                            lead = next((l for l in all_leads if l.get("email") == email), None)
                            
                            if not lead:
                                continue
                            
                            # Generate and send email
                            result = send_sales_email(
                                customer_name=lead.get("company_name"),
                                customer_email=email,
                                lead_score=lead.get("lead_score", 0),
                                quote_value=lead.get("quote_value", 0),
                                item_count=lead.get("item_count", 0),
                                subject=f"Exclusive {campaign['campaign_type']} Opportunity"
                            )
                            
                            if result.get("success"):
                                emails_sent += 1
                            
                            # Throttle - wait before next email
                            time.sleep(delay)
                            
                        except Exception as e:
                            print(f"Error sending to {email}: {e}")
                    
                    # Update campaign progress
                    await db.update_campaign_status(
                        str(campaign["_id"]),
                        status="completed",
                        emails_sent=emails_sent
                    )
                    
                    print(f"✅ Campaign Complete: {emails_sent} emails sent")
                    
                except Exception as e:
                    print(f"Campaign execution error: {e}")
        
        except Exception as e:
            print(f"❌ Campaign Execution Failed: {e}")
    
    async def sync_crm_data(self):
        """
        Automated CRM data sync.
        Problem statement: "Ingest customer data from CRM"
        """
        print(f"\n🔄 CRM Sync Job at {datetime.now()}")
        print("CRM sync would run here (requires CRM credentials)")
    
    def start(self):
        """
        Start the scheduler with all jobs using MongoDB persistence.
        
        RENDER COMPATIBILITY:
        - Jobs are stored in MongoDB, not memory
        - Jobs survive app restarts and deployments
        - Duplicate jobs are prevented by checking existing IDs
        """
        if self.is_running:
            print("⚠️ Scheduler already running")
            return
        
        try:
            self.scheduler.start()
            self.is_running = True
            
            # List of jobs to ensure exist
            jobs_config = [
                {
                    'id': 'monthly_segmentation',
                    'func': self.monthly_segmentation_job,
                    'trigger': CronTrigger(day=1, hour=2, minute=0),
                    'name': 'Monthly Customer Segmentation'
                },
                {
                    'id': 'campaign_execution',
                    'func': self.execute_scheduled_campaigns,
                    'trigger': CronTrigger(minute="*/15"),
                    'name': 'Email Campaign Execution'
                },
                {
                    'id': 'scheduled_email_dispatch',
                    'func': self.execute_scheduled_emails,
                    'trigger': CronTrigger(minute="*"),
                    'name': 'Scheduled Email Dispatcher'
                },
                {
                    'id': 'crm_sync',
                    'func': self.sync_crm_data,
                    'trigger': CronTrigger(hour=1, minute=0),
                    'name': 'Daily CRM Data Sync'
                }
            ]
            
            # Add jobs, replacing if they already exist
            for job_config in jobs_config:
                try:
                    # Remove old job if exists (to avoid duplicates)
                    self.scheduler.remove_job(job_config['id'])
                except:
                    pass  # Job doesn't exist yet, that's ok
                
                # Add the job
                self.scheduler.add_job(
                    job_config['func'],
                    job_config['trigger'],
                    id=job_config['id'],
                    name=job_config['name'],
                    replace_existing=True
                )
            
            print("✅ Automation Scheduler Started (MongoDB-Backed)")
            print("   - Source: MongoDB job store (persistent across restarts)")
            print("   - Monthly Segmentation: 1st of month at 2:00 AM UTC")
            print("   - Campaign Execution: Every 15 minutes")
            print("   - Scheduled Email Dispatch: Every 1 minute")
            print("   - CRM Sync: Daily at 1:00 AM UTC")
            
        except Exception as e:
            print(f"❌ Failed to start scheduler: {e}")
            self.is_running = False
    
    def stop(self):
        """Stop the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            self.is_running = False
            print("✅ Scheduler stopped")


# Global scheduler instance
automation_scheduler = AutomationScheduler()
