# Deploy to Render - Complete Guide

You can deploy both frontend and backend together on Render as a single web service! This is the simplest deployment option.

## Quick Deploy Steps

### Option 1: Deploy via Render Dashboard (Recommended)

1. **Go to Render Dashboard**
   - Visit [render.com](https://render.com)
   - Sign up or log in with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `manky136/auction`
   - Click "Connect"

3. **Configure the Service**
   - **Name**: `cricket-auction` (or any name you prefer)
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: (leave empty)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid if you prefer)

4. **Add Environment Variables**
   - Click "Advanced" → "Add Environment Variable"
   - **Key**: `SECRET_KEY`
   - **Value**: Generate a random string (you can use: `openssl rand -hex 32` or any random string generator)
   - Click "Add"
   - **Key**: `NODE_ENV`
   - **Value**: `production`
   - Click "Add"

5. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Your app will be live at: `https://cricket-auction.onrender.com` (or your custom name)

### Option 2: Deploy via render.yaml (Automatic)

If you've already pushed the `render.yaml` file to your repository:

1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and configure everything
5. Review settings and click "Apply"

## How It Works

- **Single Service**: Both frontend (HTML/CSS/JS) and backend (API) run on the same Render service
- **Static Files**: The Express server serves static files from the `public` folder
- **API Routes**: All API calls go to `/api/*` which is handled by the same server
- **No CORS Issues**: Since everything is on the same domain, no CORS configuration needed

## Environment Variables

Required:
- `SECRET_KEY`: Random string for JWT token signing (Render can generate this)
- `NODE_ENV`: Set to `production`

Optional:
- `PORT`: Automatically set by Render (you don't need to set this)

## Persistent Data Storage

**IMPORTANT**: To prevent data loss on Render, you need to configure a persistent disk:

### If Using render.yaml (Automatic)
The `render.yaml` file already includes persistent disk configuration:
```yaml
disk:
  name: auction-data
  mountPath: /opt/render/project/src/data
  sizeGB: 1
```

This ensures your data persists across deployments and service restarts.

### If Configuring Manually via Dashboard

1. Go to your service in Render Dashboard
2. Click on "Disks" in the left sidebar
3. Click "Add Disk"
4. Configure:
   - **Name**: `auction-data`
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: 1 GB (free tier allows up to 1GB)
5. Click "Save"
6. **Important**: Render will restart your service to mount the disk

### How It Works
- The `data/` directory is mounted to a persistent disk
- Data survives service restarts and redeployments
- Free tier includes 1GB of persistent storage
- Data is automatically backed up by Render

### Verifying Persistent Storage
After adding the disk:
1. Add some teams/players via the admin dashboard
2. Trigger a manual redeploy in Render
3. Check if your data is still there after deployment completes


## Custom Domain (Optional)

1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain
4. Follow DNS configuration instructions

## Free Tier Limitations

- **Spins down after 15 minutes** of inactivity
- **First request** after spin-down may take 30-60 seconds (cold start)
- **750 hours/month** free (enough for most use cases)

## Troubleshooting

### App not loading
- Check build logs in Render dashboard
- Ensure `npm install` completed successfully
- Verify `npm start` command is correct

### API calls failing
- Check that API routes are working: `https://your-app.onrender.com/api/teams`
- Open browser console to see error messages
- Verify `config.js` is using `/api` for production

### Build fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (Render uses latest LTS by default)
- Check build logs for specific errors

### Slow first load
- This is normal on free tier (cold start)
- Consider upgrading to paid plan for always-on service

## Updating Your App

1. Push changes to GitHub
2. Render automatically detects changes
3. Triggers new deployment
4. Wait 2-3 minutes for deployment

Or manually trigger:
1. Go to Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"

## Monitoring

- View logs in real-time from Render dashboard
- Check metrics (CPU, Memory, Requests)
- Set up alerts for errors

## Database (Future Enhancement)

For production use, consider:
- **PostgreSQL** (Render offers free PostgreSQL)
- **MongoDB Atlas** (free tier available)
- Update `server.js` to use database instead of JSON files

## Security Notes

- Change default admin password after first login
- Use a strong `SECRET_KEY` (Render can generate one)
- Consider rate limiting for production
- Enable HTTPS (automatic on Render)

## Support

- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
- Community: https://community.render.com

