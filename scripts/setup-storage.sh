#!/bin/bash

# Firebase Storage Setup Script
# This script helps set up Firebase Storage and configure CORS

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== Firebase Storage Setup =====${NC}"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo -e "${RED}Error: Firebase CLI not found${NC}"
  echo "Please install Firebase CLI with: npm install -g firebase-tools"
  exit 1
fi

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${YELLOW}Warning: Google Cloud SDK not found${NC}"
  echo "CORS configuration will need to be done manually through the Google Cloud Console."
  HAS_GCLOUD=false
else
  HAS_GCLOUD=true
fi

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
  echo -e "${YELLOW}Warning: gsutil not found${NC}"
  echo "CORS configuration will need to be done manually through the Google Cloud Console."
  HAS_GSUTIL=false
else
  HAS_GSUTIL=true
fi

# Check if user is logged in to Firebase
echo "Checking Firebase authentication..."
firebase login:list &> /dev/null
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}You need to log in to Firebase CLI${NC}"
  firebase login
fi

# Check for current Firebase project
echo "Checking Firebase project..."
CURRENT_PROJECT=$(firebase use | grep -o "ai-based-actors-backup")
if [ -z "$CURRENT_PROJECT" ]; then
  echo -e "${YELLOW}Project not set or not found${NC}"
  echo "Please select your Firebase project:"
  firebase use
else
  echo -e "Current project: ${GREEN}$CURRENT_PROJECT${NC}"
fi

# Create CORS configuration file if it doesn't exist
if [ ! -f "cors.json" ]; then
  echo -e "${YELLOW}Creating CORS configuration file...${NC}"
  cat > cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Content-Disposition", "Content-Length"]
  }
]
EOF
  echo -e "${GREEN}Created cors.json file${NC}"
fi

# Storage setup instructions
echo ""
echo -e "${YELLOW}Important: You need to set up Firebase Storage in the Firebase Console${NC}"
echo "1. Go to https://console.firebase.google.com/project/$CURRENT_PROJECT/storage"
echo "2. Click 'Get Started'"
echo "3. Choose a location for your storage bucket"
echo "4. Accept the default security rules for now"
echo "5. Click 'Done'"
echo ""
read -p "Have you completed the Firebase Storage setup in the console? (y/n): " STORAGE_SETUP

if [[ $STORAGE_SETUP != "y" && $STORAGE_SETUP != "Y" ]]; then
  echo -e "${YELLOW}Please complete the Firebase Storage setup before continuing.${NC}"
  echo "You can run this script again after setting up Firebase Storage."
  exit 0
fi

# Attempt to deploy storage rules
echo ""
echo -e "${GREEN}Deploying Firebase Storage rules...${NC}"
firebase deploy --only storage

# Set CORS configuration if gsutil is available
if [ "$HAS_GSUTIL" = true ] && [ "$HAS_GCLOUD" = true ]; then
  echo ""
  echo -e "${GREEN}Setting CORS configuration...${NC}"
  echo "You may be prompted to authenticate with Google Cloud if not already logged in."
  
  # Check if user is logged in to gcloud
  gcloud auth list &> /dev/null
  if [ $? -ne 0 ]; then
    echo "Logging in to Google Cloud..."
    gcloud auth login
  fi
  
  # Set the project in gcloud
  echo "Setting Google Cloud project..."
  gcloud config set project $CURRENT_PROJECT
  
  # Set CORS configuration
  echo "Configuring CORS for Firebase Storage..."
  gsutil cors set cors.json gs://$CURRENT_PROJECT.appspot.com
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}CORS configuration successful!${NC}"
  else
    echo -e "${RED}Failed to set CORS configuration.${NC}"
    echo "You may need to set it manually through the Google Cloud Console."
  fi
else
  echo ""
  echo -e "${YELLOW}CORS Configuration Instructions:${NC}"
  echo "Since gsutil is not available, you need to set CORS manually:"
  echo "1. Go to https://console.cloud.google.com/storage/browser/$CURRENT_PROJECT.appspot.com"
  echo "2. Click on the 'Permissions' tab"
  echo "3. Click 'Edit CORS configuration'"
  echo "4. Copy and paste the contents of the cors.json file"
  echo "5. Click 'Save'"
fi

echo ""
echo -e "${GREEN}Setup process completed!${NC}"
echo "If you're still experiencing CORS issues, please refer to the docs/FIREBASE-STORAGE-SETUP.md guide for troubleshooting." 