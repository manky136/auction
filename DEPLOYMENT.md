# Deployment Guide

This application requires two separate deployments:
1. **Frontend** (Static files) → Netlify
2. **Backend** (Node.js API) → Render/Railway/Vercel

## Option 1: Deploy Backend to Render (Recommended - Free)

### Step 1: Deploy Backend to Render

1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `cricket-auction-api` (or any name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: (leave empty, it's at root)
5. Add Environment Variables:
   - `PORT`: (auto-set by Render, but you can set it)
   - `SECRET_KEY`: (generate a random string for JWT)
6. Click "Create Web Service"
7. Wait for deployment (takes 2-3 minutes)
8. Copy your backend URL (e.g., `https://cricket-auction-api.onrender.com`)

### Step 2: Deploy Frontend to Netlify

1. Go to [Netlify.com](https://netlify.com) and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Base directory**: (leave empty)
   - **Build command**: `npm run build`
   - **Publish directory**: `public`
5. Add Environment Variable:
   - **Key**: `API_URL`
   - **Value**: `https://your-backend-url.onrender.com/api` (use your Render URL)
6. Click "Deploy site"
7. After deployment, go to Site settings → Build & deploy → Environment variables
8. Add `API_URL` with your backend URL + `/api`

### Step 3: Update Netlify Build Command

Since we need to inject the API URL, update the build command in Netlify:

1. Go to Site settings → Build & deploy → Build settings
2. Edit build command to: `API_URL=$API_URL npm run build`
3. Save and trigger a new deployment

## Option 2: Deploy Backend to Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js
5. Add environment variable `SECRET_KEY`
6. Deploy
7. Copy the Railway URL and use it in Netlify's `API_URL`

## Option 3: Deploy Backend to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: (leave empty)
   - **Build Command**: (leave empty or `npm install`)
   - **Output Directory**: (leave empty)
4. Add environment variables
5. Deploy

## Testing Locally with Production API

If you want to test the frontend locally with a deployed backend:

1. Set environment variable: `export API_URL=https://your-backend.onrender.com/api`
2. Run: `npm run build`
3. The HTML files will be updated with the production API URL

## Troubleshooting

### CORS Issues
If you get CORS errors, make sure your backend has CORS enabled (it already does in `server.js`).

### API Not Found
- Check that your backend URL includes `/api` at the end
- Verify the backend is running and accessible
- Check browser console for exact error messages

### Environment Variables Not Working
- Make sure you've set `API_URL` in Netlify's environment variables
- Rebuild the site after adding environment variables
- Check that the build command includes `API_URL=$API_URL`

## Quick Deploy Commands

### Render (Backend)
```bash
# After connecting repo, Render handles deployment automatically
# Just set environment variables in dashboard
```

### Netlify (Frontend)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## Notes

- Render free tier spins down after 15 minutes of inactivity (first request may be slow)
- Consider using Railway or Vercel for faster cold starts
- For production, use a proper database instead of JSON files
- Set a strong `SECRET_KEY` for JWT tokens

