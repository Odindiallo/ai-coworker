#!/bin/bash

# Firebase Permissions Test Script
# This script helps test Firebase Firestore and Storage permissions
# without needing to run the full application

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed${NC}"
  echo "Please install Node.js to run this script"
  exit 1
fi

# Create test directory if it doesn't exist
mkdir -p .temp-tests

echo -e "${GREEN}===== Firebase Permissions Test =====${NC}"
echo ""

# Check if Firebase project is configured
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create a .env file with your Firebase configuration"
  exit 1
fi

# Create the test file
cat > .temp-tests/firebase-permission-test.js << 'EOF'
// Firebase Permission Test Script
const fs = require('fs');
const dotenv = require('dotenv');
const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword 
} = require('firebase/auth');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc
} = require('firebase/firestore');
const {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} = require('firebase/storage');

// Load environment variables
dotenv.config();

// Helper function to get environment variables with fallbacks
const getEnvVariable = (viteKey, reactKey) => {
  // Check for Vite-style env vars first
  if (process.env[viteKey]) {
    return process.env[viteKey];
  }
  // Fall back to React-style env vars
  if (process.env[reactKey]) {
    return process.env[reactKey];
  }
  // Log a warning if neither is found
  console.warn(`Environment variable ${viteKey} or ${reactKey} not found`);
  return '';
};

// Get Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: getEnvVariable('VITE_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnvVariable('VITE_FIREBASE_AUTH_DOMAIN', 'REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVariable('VITE_FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVariable('VITE_FIREBASE_STORAGE_BUCKET', 'REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVariable('VITE_FIREBASE_MESSAGING_SENDER_ID', 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVariable('VITE_FIREBASE_APP_ID', 'REACT_APP_FIREBASE_APP_ID'),
  measurementId: getEnvVariable('VITE_FIREBASE_MEASUREMENT_ID', 'REACT_APP_FIREBASE_MEASUREMENT_ID'),
};

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is incomplete. Check your .env file.');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Test result interface
class TestResult {
  constructor(name, collection, operation) {
    this.name = name;
    this.collection = collection;
    this.operation = operation;
    this.success = null;
    this.errorMessage = null;
  }

  setSuccess() {
    this.success = true;
    return this;
  }

  setFailure(errorMessage) {
    this.success = false;
    this.errorMessage = errorMessage;
    return this;
  }
}

// Test Firebase permissions
async function testFirebasePermissions(email, password) {
  const results = [];
  let user = null;
  
  console.log('\n------------------------------');
  console.log('STARTING FIREBASE PERMISSION TESTS');
  console.log('------------------------------\n');
  
  try {
    // Sign in
    console.log(`Signing in as ${email}...`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    user = userCredential.user;
    console.log(`Signed in successfully as ${user.email} (${user.uid})`);
    
    // Test collections
    const collectionsToTest = ['users', 'actors', 'user_activity', 'user_stats'];
    
    // Test read permissions
    for (const collectionName of collectionsToTest) {
      const testResult = new TestResult(`Read ${collectionName}`, collectionName, 'read');
      console.log(`Testing read permission for ${collectionName}...`);
      
      try {
        const q = query(
          collection(firestore, collectionName),
          where('userId', '==', user.uid)
        );
        await getDocs(q);
        results.push(testResult.setSuccess());
        console.log(`✅ Successfully read from ${collectionName}`);
      } catch (error) {
        results.push(testResult.setFailure(error.message));
        console.log(`❌ Failed to read from ${collectionName}: ${error.message}`);
      }
    }
    
    // Test write permissions for users collection
    const userTestResult = new TestResult('Write user doc', 'users', 'write');
    console.log('Testing write permission for users collection...');
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      const timestamp = new Date().toISOString();
      await setDoc(userDocRef, { lastTested: timestamp }, { merge: true });
      results.push(userTestResult.setSuccess());
      console.log('✅ Successfully wrote to users collection');
    } catch (error) {
      results.push(userTestResult.setFailure(error.message));
      console.log(`❌ Failed to write to users collection: ${error.message}`);
    }
    
    // Test write permissions for actors collection
    const actorTestResult = new TestResult('Write actor doc', 'actors', 'write');
    console.log('Testing write permission for actors collection...');
    const testActorId = `test_${Date.now()}`;
    try {
      const actorDocRef = doc(firestore, 'actors', testActorId);
      await setDoc(actorDocRef, {
        name: 'Test Actor',
        userId: user.uid,
        createdAt: new Date(),
        modelStatus: 'pending'
      });
      results.push(actorTestResult.setSuccess());
      console.log('✅ Successfully wrote to actors collection');
      
      // Clean up
      await deleteDoc(actorDocRef);
    } catch (error) {
      results.push(actorTestResult.setFailure(error.message));
      console.log(`❌ Failed to write to actors collection: ${error.message}`);
    }
    
    // Test storage permissions
    const storageTestResult = new TestResult('Storage upload', 'storage', 'write');
    console.log('Testing storage write permission...');
    try {
      const testPath = `test/${user.uid}/test-file-${Date.now()}.txt`;
      const testFileRef = ref(storage, testPath);
      await uploadString(testFileRef, 'Test content for permission check');
      await getDownloadURL(testFileRef);
      results.push(storageTestResult.setSuccess());
      console.log('✅ Successfully uploaded to storage');
      
      // Clean up
      await deleteObject(testFileRef);
    } catch (error) {
      results.push(storageTestResult.setFailure(error.message));
      console.log(`❌ Failed to upload to storage: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error during permission tests:', error);
  } finally {
    // Sign out
    if (user) {
      await signOut(auth);
      console.log('Signed out');
    }
  }
  
  // Print summary
  console.log('\n------------------------------');
  console.log('TEST RESULTS SUMMARY');
  console.log('------------------------------');
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${result.collection} | ${result.operation}`);
    if (!result.success && result.errorMessage) {
      console.log(`  └─ Error: ${result.errorMessage}`);
    }
  });
  
  console.log('\nSummary:');
  console.log(`${successCount} passed, ${failCount} failed`);
  
  return results;
}

// Main function
async function main() {
  if (process.argv.length < 4) {
    console.error('Usage: node firebase-permission-test.js <email> <password>');
    process.exit(1);
  }
  
  const email = process.argv[2];
  const password = process.argv[3];
  
  await testFirebasePermissions(email, password);
}

main().catch(console.error);
EOF

echo "Installing dependencies..."
cd .temp-tests
npm init -y > /dev/null
npm install --save firebase dotenv > /dev/null
cd ..

echo -e "${GREEN}Dependencies installed.${NC}"
echo ""
echo "This script will test Firebase permissions using your account."
echo "The tests will try to read and write to Firestore collections and Storage."
echo ""
read -p "Enter your email: " email
read -s -p "Enter your password: " password
echo ""

echo -e "${GREEN}Running permission tests...${NC}"
node .temp-tests/firebase-permission-test.js "$email" "$password"

echo ""
echo -e "${GREEN}Test completed!${NC}"
echo "You can check the results above to identify any permission issues." 