# GitHub Pages Deployment Guide

## Automatic Deployment (Recommended)

The Angular app is configured to automatically deploy to GitHub Pages when you push to the main/master branch.

### Setup Steps:

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub: https://github.com/dhiasalah/Web_Sampler_Angular_mdb
   - Navigate to **Settings** → **Pages**
   - Under "Source", select **GitHub Actions**

2. **Push your changes:**
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

3. **Wait for deployment:**
   - Go to the **Actions** tab in your repository
   - Watch the deployment workflow run
   - Once complete, your app will be live at: **https://dhiasalah.github.io/Web_Sampler_Angular_mdb/**

## Manual Deployment (Alternative)

If you prefer to deploy manually:

1. **Build the app:**
   ```bash
   cd angular-app
   npm run build:gh-pages
   ```

2. **Install gh-pages package:**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Add deploy script to package.json:**
   ```json
   "deploy": "gh-pages -d dist/angular-app/browser"
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

## Important Notes

- The app will be available at: **https://dhiasalah.github.io/Web_Sampler_Angular_mdb/**
- The base href is set to `/Web_Sampler_Angular_mdb/` to match your repository name
- Client-side routing is handled via the 404.html redirect trick
- Make sure GitHub Pages is enabled in your repository settings

## Troubleshooting

If the deployment fails:
1. Check the Actions tab for error messages
2. Ensure you have enabled GitHub Pages with "GitHub Actions" as the source
3. Verify the GITHUB_TOKEN has proper permissions (should be automatic)
4. Make sure all files are committed and pushed

## Local Testing

To test the production build locally before deploying:

```bash
cd angular-app
npm run build:gh-pages
# Serve the dist folder with any static file server
npx http-server dist/angular-app/browser -p 8080
```

Then visit: http://localhost:8080/Web_Sampler_Angular_mdb/
