# Render Deployment Guide for Sales CRM

## Prerequisites
- GitHub repository with your project
- Render account (free at render.com)
- Git installed locally

## Step-by-Step Deployment

### 1. Prepare Your Repository
```bash
# Navigate to project root
cd e:\AI\outbound

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for Render deployment"

# Add remote (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

### 2. Create Render Account & Connect GitHub
- Go to https://render.com
- Sign up with GitHub
- Authorize Render to access your repositories

### 3. Deploy Backend (Python API)

#### Step 3a: Create Web Service
1. Click "New +" → "Web Service"
2. Select your GitHub repository
3. Configure:
   - **Name**: `sales-crm-api`
   - **Environment**: `Python 3.11`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Standard (or free then upgrade)

#### Step 3b: Add Environment Variables
In the Web Service settings, add these variables:
```
GROQ_API_KEY=your_groq_api_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
SF_USERNAME=your_salesforce_username
SF_PASSWORD=your_salesforce_password
SF_TOKEN=your_salesforce_token
USE_CRM=true
DB_NAME=ai_sales_db
```

**Note**: `MONGO_URL` will be automatically set after MongoDB is deployed

### 4. Deploy MongoDB Database

#### Step 4a: Create Private Service
1. Click "New +" → "Private Service"
2. Configure:
   - **Name**: `sales-crm-db`
   - **Environment**: `MongoDB`
   - **Plan**: Free or Standard
3. Click "Create Private Service"

#### Step 4b: Get Connection String
- Once created, go to the service page
- Copy the connection string (Internal URL)
- Add to Backend environment variables:
  ```
  MONGO_URL=mongodb+srv://user:pass@host/db?retryWrites=true&w=majority
  ```

### 5. Deploy Frontend (React App)

#### Step 5a: Create Static Site
1. Click "New +" → "Static Site"
2. Select your GitHub repository
3. Configure:
   - **Name**: `sales-crm-frontend`
   - **Build Command**: `cd Frontend && npm install && npm run build`
   - **Publish Directory**: `Frontend/dist`
   - **Plan**: Free

#### Step 5b: Add Environment Variables
```
VITE_API_URL=https://sales-crm-api.onrender.com
```

### 6. Update Frontend API Configuration

Update `Frontend/src/services/api.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
```

### 7. Verify Deployments

#### Backend Health Check
```bash
curl https://sales-crm-api.onrender.com/docs
```

#### Frontend Access
Open `https://sales-crm-frontend.onrender.com` in browser

#### Check Logs
- Backend: Click service → "Logs" tab
- Frontend: Click service → "Logs" tab
- MongoDB: Click service → "Logs" tab

### 8. Configure CORS (if needed)

In `backend/app/main.py`, update CORS:
```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sales-crm-frontend.onrender.com",
        "http://localhost:3000",  # For local testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 9. Database Initialization

On first deployment, seed your database:
```bash
# SSH into Render backend service
# Run initialization script
python auto_generate_leads.py
```

Or add initialization to `app/main.py` startup event

### 10. Monitor & Maintain

**Check Logs Daily**:
- Monitor errors and warnings
- Track API response times

**Backup MongoDB**:
- Render doesn't auto-backup free tier
- Set up manual backups or upgrade to Standard

**Update Environment Variables As Needed**:
- Email credentials
- API keys
- CRM tokens

## Troubleshooting

### Backend won't start
- Check logs: `https://dashboard.render.com/services`
- Verify `requirements.txt` is in backend directory
- Ensure Python version matches

### Frontend can't reach backend
- Check `VITE_API_URL` environment variable
- Verify CORS is configured
- Check browser console for errors

### MongoDB connection fails
- Verify connection string in backend
- Check private service is running
- Ensure firewall allows connections

### Still having issues?
Check the logs in Render dashboard for specific error messages

## 🔧 Scheduler Fix for Render (Persistent Jobs)

### Problem
Email scheduling was failing on Render after app restarts because APScheduler was storing jobs in memory only. When your app restarted (after deployments or inactivity), all scheduled jobs were lost.

### Solution: MongoDB-Backed Job Store
We've updated the scheduler to use MongoDB for persistent job storage, so scheduled emails survive app restarts and deployments.

#### What Changed
1. Added `pymongo` to `requirements.txt`
2. Updated `app/scheduler.py` to use `MongoDBJobStore`
3. Jobs are now stored in MongoDB `scheduler_jobs` collection

#### Verification
After redeploying, check the backend logs:
```
✅ Automation Scheduler Started (MongoDB-Backed)
   - Source: MongoDB job store (persistent across restarts)
   - Scheduled Email Dispatch: Every 1 minute
```

If you see this message, the fix is working! ✅

#### How It Works
- Scheduled emails are stored in MongoDB
- Every minute, the scheduler checks for due emails
- Even after app restart, jobs are reloaded from MongoDB
- No emails are lost between restarts

#### Database Collection
Jobs are stored in `ai_sales_db.scheduler_jobs` with this structure:
```json
{
  "_id": "ObjectId",
  "id": "scheduled_email_dispatch",
  "name": "Scheduled Email Dispatcher",
  "next_run_time": "2026-04-12T10:00:00",
  "trigger": "cron[minute='*']",
  "func": "app.scheduler:execute_scheduled_emails",
  "args": [],
  "kwargs": {},
  "coalesce": true,
  "max_instances": 1,
  "modified_time": "2026-04-12T10:00:00"
}
```

### Deployment Steps
1. Update your GitHub repository with the new code
2. Push changes: `git push origin main`
3. Render will automatically redeploy your backend
4. Check logs to verify scheduler started with MongoDB backing
5. Test by scheduling a new email campaign

### Manual Job Management (if needed)
To view/delete jobs from Render:
```bash
# SSH into backend service
# Connect to MongoDB
mongosh $MONGO_URL

# Check scheduled jobs
use ai_sales_db
db.scheduler_jobs.find()

# Clear all jobs (dangerous, do only if needed)
# db.scheduler_jobs.deleteMany({})

# Clear specific job
# db.scheduler_jobs.deleteOne({id: "scheduled_email_dispatch"})
```

## Useful Render Links
- Dashboard: https://dashboard.render.com
- Docs: https://render.com/docs
- Support: https://render.com/support

## Cost Estimation (FREE TIER)
- Frontend Static Site: Free
- Backend Web Service: Free (auto-spins down after 15 min inactivity)
- MongoDB: Free (512MB storage, limited to Private Service)

**Note**: Free services have limitations. Consider upgrading to Standard for production use.
