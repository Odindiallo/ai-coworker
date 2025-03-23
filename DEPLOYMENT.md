# Deploying to Vercel

This document outlines the steps to deploy the AI Actor Generator to Vercel in production mode.

## Prerequisites

1. A Vercel account
2. The Vercel CLI installed (optional, for local testing)
3. Git for version control

## Environment Variables

Make sure the following environment variables are set in your Vercel project settings:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_APP_ENV=production`
- `VITE_HUGGINGFACE_TOKEN`

## Deployment Steps

### Option 1: Deploy via Git Integration (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect your Vercel account to your Git provider
3. Import the repository into Vercel
4. Configure your project settings in Vercel:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`
5. Add the environment variables
6. Deploy the project

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`
3. Navigate to the project directory: `cd ai-actor-generator`
4. Deploy to production: `vercel --prod`

## Post-Deployment Verification

1. Visit your deployed application
2. Check that the API health endpoint returns a 200 response: `https://your-domain.vercel.app/api/health`
3. Verify that authentication and Firebase functions are working properly

## Troubleshooting

- If you encounter issues with environment variables, ensure they are properly set in the Vercel dashboard
- If builds fail, check the build logs in the Vercel dashboard for specific errors
- For API route issues, verify that the serverless functions are properly configured

## Production Monitoring

- Set up Vercel Analytics to monitor performance
- Configure error tracking through a service like Sentry
- Set up uptime monitoring for the production application
