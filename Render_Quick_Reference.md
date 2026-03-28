# 📋 Render Deployment Quick Reference

## URLs After Deployment

```
Frontend:  https://sales-crm-frontend.onrender.com
Backend:   https://sales-crm-api.onrender.com
Database:  Private MongoDB (connection details in Render dashboard)
```

## Backend Health Endpoints

```bash
# Health check
curl https://sales-crm-api.onrender.com/health

# API documentation
https://sales-crm-api.onrender.com/docs

# Get leads
curl https://sales-crm-api.onrender.com/leads

# Get campaigns
curl https://sales-crm-api.onrender.com/campaigns
```

## Database Connection

After MongoDB service is created:
1. Go to Render Dashboard → MongoDB Private Service
2. Copy the connection string
3. Add to Backend service environment variables as `MONGO_URL`

## Environment Variables by Service

### Backend (sales-crm-api)
```
GROQ_API_KEY=<your_key>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your_email>
EMAIL_PASSWORD=<gmail_app_password>
MONGO_URL=<auto_set_by_mongo_service>
DB_NAME=ai_sales_db
USE_CRM=true/false
SF_USERNAME=<if_crm_enabled>
SF_PASSWORD=<if_crm_enabled>
SF_TOKEN=<if_crm_enabled>
FRONTEND_URL=https://sales-crm-frontend.onrender.com
```

### Frontend (sales-crm-frontend)
```
VITE_API_URL=https://sales-crm-api.onrender.com
```

## Common Issues & Fixes

### Issue: Frontend can't reach backend
**Fix**: 
- Check VITE_API_URL environment variable
- Verify CORS in backend main.py includes frontend URL
- Check browser Network tab for actual request URL

### Issue: Backend won't start
**Fix**:
- Check requirements.txt is in backend directory
- View Render logs for specific error
- Verify MONGO_URL format

### Issue: Database connection fails
**Fix**:
- Ensure MongoDB Private Service is running
- Copy correct connection string from Render dashboard
- Wait 2-3 minutes for cold start after creation

### Issue: Frequent spindowns (free tier)
**Solution**:
- Upgrade Backend to Standard plan
- Or use Render's recommended patterns

## Database Initialization

After first deployment, seed your database:

```bash
# SSH into backend via Render shell
# Run from /opt/render/project/backend/:
python auto_generate_leads.py

# Or trigger via API:
curl -X POST https://sales-crm-api.onrender.com/initialize-db
```

## Monitoring

Check logs anytime:
1. Go to https://dashboard.render.com
2. Click on service name
3. Click "Logs" tab
4. Look for errors/warnings

## Deployment Workflow

```bash
# Update code
git add .
git commit -m "Your message"
git push origin main

# Render auto-deploys! Check dashboard for progress
```

## Redeployment

To redeploy (if services aren't auto-redeploying):
1. Go to service in Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"

## Free Mode Limitations

- Backend auto-spins down after 15 min of no requests (cold start = 30-50s)
- MongoDB limited to 512MB storage
- No automatic backups
- Limited to 1 free tier service per category

**Consider upgrading when:**
- You need 24/7 uptime
- You reach MongoDB storage limit
- You need automated backups

## Support

- Render Docs: https://render.com/docs
- Status Page: https://status.render.com
- Support: https://render.com/support
