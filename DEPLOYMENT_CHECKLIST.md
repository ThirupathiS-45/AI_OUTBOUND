# 🚀 Render Deployment Checklist

## Pre-Deployment (Local Setup)
- [ ] Git repository initialized and synced with GitHub
- [ ] All code committed and pushed to GitHub
- [ ] `.env.local` file is in `.gitignore` (not committed)
- [ ] `requirements.txt` updated with all Python dependencies
- [ ] `package.json` has correct build script for frontend
- [ ] `.env.render.example` updated with all required variables

## Render Account Setup
- [ ] Render account created (render.com)
- [ ] GitHub account connected to Render
- [ ] Repository selected in Render dashboard

## Backend Service (Python/FastAPI)
- [ ] Create Web Service from GitHub repo
- [ ] Set Name: `sales-crm-api`
- [ ] Set Environment: `Python 3.11`
- [ ] Set Build Command: `pip install -r requirements.txt`
- [ ] Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Set Runtime root directory: `./backend`
- [ ] Add all environment variables (see `.env.render.example`)
- [ ] Verify service deployed successfully
- [ ] Check backend logs for errors

## MongoDB Service (Private Database)
- [ ] Create Private Service
- [ ] Set Name: `sales-crm-db`
- [ ] Set Environment: `MongoDB`
- [ ] Copy internal connection string
- [ ] Add to Backend service as `MONGO_URL` environment variable
- [ ] Verify database is running

## Frontend Service (React/Vite)
- [ ] Create Static Site from GitHub repo
- [ ] Set Name: `sales-crm-frontend`
- [ ] Set Build Command: `cd Frontend && npm install && npm run build`
- [ ] Set Publish Directory: `Frontend/dist`
- [ ] Add environment variable: `VITE_API_URL=https://sales-crm-api.onrender.com`
- [ ] Verify service deployed successfully
- [ ] Check frontend logs for build errors

## Post-Deployment Testing
- [ ] Backend health check: `https://sales-crm-api.onrender.com/health`
- [ ] Backend docs: `https://sales-crm-api.onrender.com/docs`
- [ ] Frontend loads: `https://sales-crm-frontend.onrender.com`
- [ ] Frontend can reach backend API
- [ ] Test lead retrieval endpoint
- [ ] Test email sending (if backend has leads)
- [ ] Check browser console for CORS errors
- [ ] Verify database connection in backend logs

## Production Configuration
- [ ] Enable auto-deploy on GitHub push
- [ ] Set up error monitoring/alerts
- [ ] Configure database backups
- [ ] Test frontend and backend in separate browsers/incognito
- [ ] Monitor logs for errors
- [ ] Set up email notifications for deployment failures

## Troubleshooting
- [ ] Check backend logs for startup errors
- [ ] Check frontend logs for build errors
- [ ] Verify MONGO_URL connection string format
- [ ] Verify VITE_API_URL in frontend environment
- [ ] Test CORS by checking network requests in browser DevTools
- [ ] Restart all services if variables changed

## Useful Render Dashboard Links
- [ ] Backend Service: https://dashboard.render.com/services
- [ ] Frontend Service: https://dashboard.render.com/services
- [ ] MongoDB Service: https://dashboard.render.com/services
- [ ] GitHub Integration: https://dashboard.render.com/repo-settings

## Scaling & Upgrades (If Needed)
- [ ] Upgrade Backend from free to Standard (if spindown is issue)
- [ ] Upgrade MongoDB for production use (current has 512MB limit)
- [ ] Add custom domain (manage via Render settings)
- [ ] Configure SSL/TLS (auto-enabled by Render)
