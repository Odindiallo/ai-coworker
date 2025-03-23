# Firebase Permissions Guide

This document explains how Firebase permissions are handled in the AI Actor Generator application and provides guidance for troubleshooting and fixing permission issues.

## Overview

The application uses Firebase Firestore and Storage for data management. Firebase Security Rules protect this data and determine who can read and write to different collections.

## Security Rules

The security rules for Firestore are defined in `firebase/firestore.rules`. The primary rules are:

- Users can only read and write their own data in the `users` collection
- Any authenticated user can read from the `actors` collection (for demonstration purposes)
- Only the owner of an actor can create, update, or delete it
- Activity data is readable by authenticated users but only writable by the owner
- User stats are readable by authenticated users but only writable via Firebase Functions

## Error Handling Approach

The application includes robust error handling for Firebase permission issues:

1. **Detection**: The `isFirebasePermissionError()` function in `utils/errorHandling.ts` detects permission denied errors by checking error messages against common patterns.

2. **Logging**: The `logPermissionError()` function provides detailed logging of permission errors with context about the collection and operation.

3. **User Feedback**: The `getUserFriendlyErrorMessage()` function converts technical error messages into user-friendly messages.

4. **Fallback Data**: Components use dummy/sample data when permission errors occur, allowing the UI to function in demonstration mode.

## Components with Permission Handling

The following components have been updated with Firebase permission error handling:

- `DashboardPage.tsx` - Handles permission errors when fetching actors
- `FavoriteActors.tsx` - Handles permission errors when fetching and updating favorite actors
- `ActivityFeed.tsx` - Handles permission errors when fetching user activity
- `UsageStats.tsx` - Handles permission errors when fetching usage statistics

## Testing Firebase Permissions

### Using the UI
 
1. Enable the Firebase Permission Test by clicking the "Show Firebase Tests" button at the bottom of the Dashboard page.
2. Click "Run Tests" to check permissions for all collections.
3. Review the test results to identify which permissions are failing.

### Using the CLI Scripts

1. Run the permission test script:
   ```bash
   ./scripts/test-permissions.sh
   ```
2. Enter your email and password when prompted.
3. The script will test reading and writing to all collections and display the results.

## Fixing Permission Issues

### Deploying Updated Rules

1. If you need to update the security rules, edit `firebase/firestore.rules` and/or `firebase/storage.rules`.
2. Deploy the updated rules using the deploy script:
   ```bash
   ./scripts/deploy-rules.sh
   ```
3. Choose option 1 for Firestore rules, option 2 for Storage rules, or option 3 for both.

### Common Permission Issues

1. **Missing Authentication**: Ensure the user is properly authenticated before attempting to access protected resources.

2. **Missing or Invalid User ID**: When querying collections that filter by `userId`, ensure the user's ID is available and correctly formatted.

3. **Writing to Read-Only Collections**: Some collections like `user_stats` can only be written to by Firebase Functions.

4. **Cross-User Access**: Users can only access their own data, not data belonging to other users.

## Development Mode vs. Production

- In development, you may want to use relaxed rules for testing.
- In production, always use strict security rules to protect user data.
- The security rules can be conditionally set based on the Firebase project (dev vs. prod).

## Testing with the Firebase Emulator

For local development without affecting production data:

1. Install the Firebase CLI and emulators:
   ```bash
   npm install -g firebase-tools
   firebase init emulators
   ```

2. Run the emulators:
   ```bash
   firebase emulators:start
   ```

3. Update your application code to connect to the emulators during development. 