#!/bin/bash

# Firebase Rules Deployment Script
# This script helps deploy Firestore and Storage rules
# and verifies that the correct environment variables are set

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create a .env file with your Firebase configuration."
  exit 1
fi

echo -e "${GREEN}===== Firebase Rules Deployment =====${NC}"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo -e "${RED}Error: Firebase CLI not found${NC}"
  echo "Please install Firebase CLI with: npm install -g firebase-tools"
  exit 1
fi

# Check if user is logged in
echo "Checking Firebase authentication..."
firebase login:list &> /dev/null
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}You need to log in to Firebase CLI${NC}"
  firebase login
fi

# Check for firebase.json file
if [ ! -f "firebase.json" ]; then
  echo -e "${YELLOW}Creating firebase.json file...${NC}"
  cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firebase/firestore.rules",
    "indexes": "firebase/firestore.indexes.json"
  },
  "storage": {
    "rules": "firebase/storage.rules"
  },
  "functions": {
    "source": "functions"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true
    }
  }
}
EOF
  echo -e "${GREEN}Created firebase.json file${NC}"
fi

# Create firestore indexes file if it doesn't exist
if [ ! -f "firebase/firestore.indexes.json" ]; then
  echo -e "${YELLOW}Creating firestore.indexes.json file...${NC}"
  mkdir -p firebase
  cat > firebase/firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "actors",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "user_activity",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF
  echo -e "${GREEN}Created firestore.indexes.json file${NC}"
fi

# Allow user to choose what to deploy
echo ""
echo "What would you like to deploy?"
echo "1) Firestore rules only"
echo "2) Storage rules only"
echo "3) Both Firestore and Storage rules"
echo "4) Everything (Firestore, Storage rules, and Functions)"
echo "5) Test environment variables"
echo "6) Exit"
read -p "Enter your choice (1-6): " choice

case $choice in
  1)
    echo -e "${GREEN}Deploying Firestore rules...${NC}"
    firebase deploy --only firestore:rules
    ;;
  2)
    echo -e "${GREEN}Deploying Storage rules...${NC}"
    firebase deploy --only storage:rules
    ;;
  3)
    echo -e "${GREEN}Deploying both Firestore and Storage rules...${NC}"
    firebase deploy --only firestore:rules,storage:rules
    ;;
  4)
    echo -e "${GREEN}Deploying Firestore rules, Storage rules, and Functions...${NC}"
    firebase deploy
    ;;
  5)
    echo -e "${GREEN}Testing environment variables...${NC}"
    # Get the firebase project ID from .env
    if grep -q "REACT_APP_FIREBASE_PROJECT_ID" .env; then
      PROJECT_ID=$(grep "REACT_APP_FIREBASE_PROJECT_ID" .env | cut -d '=' -f2)
      echo -e "Found project ID: ${GREEN}$PROJECT_ID${NC}"
    elif grep -q "VITE_FIREBASE_PROJECT_ID" .env; then
      PROJECT_ID=$(grep "VITE_FIREBASE_PROJECT_ID" .env | cut -d '=' -f2)
      echo -e "Found project ID: ${GREEN}$PROJECT_ID${NC}"
    else
      echo -e "${RED}No Firebase project ID found in .env file${NC}"
      echo "Please add REACT_APP_FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID to your .env file"
      exit 1
    fi
    
    # Check if this project exists
    firebase projects:list | grep -q "$PROJECT_ID"
    if [ $? -ne 0 ]; then
      echo -e "${RED}Error: Project $PROJECT_ID not found in your Firebase account${NC}"
      echo "Please check your Firebase project ID or login with the correct account"
      exit 1
    else
      echo -e "${GREEN}Project $PROJECT_ID found in your Firebase account${NC}"
      echo "Environment variables look good!"
    fi
    ;;
  6)
    echo "Exiting..."
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}Deployment completed!${NC}"
echo "Don't forget to update your Firebase security rules if needed." 