# Firebase Storage Setup Guide

This guide will help you set up Firebase Storage properly for the AI Actor Generator application to resolve CORS (Cross-Origin Resource Sharing) issues.

## Problem: CORS Errors

If you're seeing errors like this:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://firebasestorage.googleapis.com/v0/b/[project-id].appspot.com/o/...
```

This indicates that Firebase Storage hasn't been properly configured for your project.

## Solution: Three-Step Process

### Step 1: Initialize Firebase Storage in the Firebase Console

1. Open the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`ai-based-actors-backup`)
3. In the left sidebar, click on "Storage"
4. Click "Get Started" to set up Firebase Storage
5. Choose a location for your Storage bucket (select the region closest to your users)
6. Accept the default security rules for now (we'll update them later)
7. Click "Done"

### Step 2: Configure CORS for Firebase Storage

Firebase Storage requires proper CORS configuration to allow your web application to access the stored files.

#### Option A: Using Firebase CLI with gsutil (Recommended)

1. Install Google Cloud SDK which includes gsutil:
   ```bash
   # For Ubuntu/Debian
   sudo apt install google-cloud-sdk
   
   # For other platforms, follow the instructions at:
   # https://cloud.google.com/sdk/docs/install
   ```

2. Log in to Google Cloud:
   ```bash
   gcloud auth login
   ```

3. Set the project:
   ```bash
   gcloud config set project ai-based-actors-backup
   ```

4. Use the provided `cors.json` file to set CORS configuration:
   ```bash
   gsutil cors set cors.json gs://ai-based-actors-backup.appspot.com
   ```

#### Option B: Using Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "Storage" -> "Buckets"
3. Find your Firebase Storage bucket (typically named `[project-id].appspot.com`)
4. Click on the bucket name to open the bucket details
5. Go to the "Permissions" tab
6. Click "Edit CORS Configuration"
7. Add the following CORS configuration:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Content-Disposition", "Content-Length"]
     }
   ]
   ```
8. Click "Save"

### Step 3: Deploy Firebase Storage Rules

Once Firebase Storage is initialized, you can deploy your security rules:

1. Make sure your `firebase.json` file includes the storage configuration:
   ```json
   {
     "storage": {
       "rules": "firebase/storage.rules"
     }
   }
   ```

2. Deploy the storage rules using Firebase CLI:
   ```bash
   firebase deploy --only storage
   ```

## Testing the Setup

After completing the setup:

1. Restart your development server
2. Clear your browser cache (or use incognito mode)
3. Try again to load images from Firebase Storage

## Troubleshooting

If you're still experiencing CORS issues:

1. **Check Browser Console**: Look for specific error messages that might provide more details.

2. **Verify CORS Configuration**: 
   ```bash
   gsutil cors get gs://ai-based-actors-backup.appspot.com
   ```
   
3. **Check Storage Rules**: Make sure your rules allow reading from the appropriate locations.
   
4. **Verify Authentication**: Ensure your user is properly authenticated if your storage rules require it.

5. **Check Image URLs**: Ensure the URLs being used to access images are correct.

## Additional Resources

- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Google Cloud Storage CORS Configuration](https://cloud.google.com/storage/docs/configuring-cors)
- [Firebase Security Rules for Storage](https://firebase.google.com/docs/storage/security) 