"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceStorageLimits = exports.healthCheck = exports.updateUserStatsOnTrainingComplete = exports.updateUserStatsOnImageGeneration = exports.updateUserStatsOnActorCreation = exports.corsProxy = exports.generateImage = exports.getModelTrainingStatus = exports.initiateModelTraining = exports.logErrorToCrashlytics = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
// Initialize Firebase Admin
admin.initializeApp();
// Import function modules
const crashlytics_1 = require("./crashlytics");
Object.defineProperty(exports, "logErrorToCrashlytics", { enumerable: true, get: function () { return crashlytics_1.logErrorToCrashlytics; } });
const modelTraining_1 = require("./modelTraining");
Object.defineProperty(exports, "initiateModelTraining", { enumerable: true, get: function () { return modelTraining_1.initiateModelTraining; } });
Object.defineProperty(exports, "getModelTrainingStatus", { enumerable: true, get: function () { return modelTraining_1.getModelTrainingStatus; } });
Object.defineProperty(exports, "generateImage", { enumerable: true, get: function () { return modelTraining_1.generateImage; } });
// Set up CORS middleware
const corsHandler = (0, cors_1.default)({ origin: true });
// CORS Proxy for Firebase Storage
exports.corsProxy = functions.https.onRequest((request, response) => {
    return corsHandler(request, response, async () => {
        try {
            const { path } = request.query;
            if (!path || typeof path !== 'string') {
                response.status(400).send({ error: 'Missing or invalid path parameter' });
                return;
            }
            // Get a reference to the file in Firebase Storage
            const bucket = admin.storage().bucket();
            const file = bucket.file(path);
            // Check if the file exists
            const [exists] = await file.exists();
            if (!exists) {
                response.status(404).send({ error: 'File not found' });
                return;
            }
            // Set the appropriate Content-Type header
            const [metadata] = await file.getMetadata();
            if (metadata.contentType) {
                response.set('Content-Type', metadata.contentType);
            }
            // Stream the file to the response
            file.createReadStream()
                .on('error', (error) => {
                console.error('Error streaming file:', error);
                response.status(500).send({ error: 'Error streaming file' });
            })
                .pipe(response);
        }
        catch (error) {
            console.error('Error in CORS proxy:', error);
            response.status(500).send({ error: 'Internal server error' });
        }
    });
});
// Function to update user stats on actor creation
exports.updateUserStatsOnActorCreation = functions.firestore
    .document('actors/{actorId}')
    .onCreate(async (snap, context) => {
    const actorData = snap.data();
    const userId = actorData.userId;
    // Get a reference to the user stats document
    const userStatsRef = admin.firestore().collection('user_stats').doc(userId);
    // Update the stats using a transaction to ensure atomic update
    try {
        await admin.firestore().runTransaction(async (transaction) => {
            const userStatsDoc = await transaction.get(userStatsRef);
            if (!userStatsDoc.exists) {
                // Create a new stats document if it doesn't exist
                transaction.set(userStatsRef, {
                    actorsCreated: 1,
                    actorsLimit: 5,
                    imagesGenerated: 0,
                    imagesLimit: 50,
                    storageUsed: 0,
                    storageLimit: 500 * 1024 * 1024,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            else {
                // Update existing stats document
                const currentStats = userStatsDoc.data() || {};
                transaction.update(userStatsRef, {
                    actorsCreated: ((currentStats.actorsCreated || 0) + 1),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });
        // Log activity
        await admin.firestore().collection('user_activity').add({
            type: 'creation',
            userId,
            actorId: context.params.actorId,
            actorName: actorData.name,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error updating user stats:', error);
        return { error: 'Failed to update user stats' };
    }
});
// Function to update user stats on image generation
exports.updateUserStatsOnImageGeneration = functions.firestore
    .document('actors/{actorId}/generations/{generationId}')
    .onCreate(async (snap, context) => {
    const generationData = snap.data();
    const userId = generationData.userId;
    const actorId = context.params.actorId;
    try {
        // First get the actor data to get the name
        const actorDoc = await admin.firestore().collection('actors').doc(actorId).get();
        if (!actorDoc.exists) {
            throw new Error('Actor document not found');
        }
        const actorData = actorDoc.data() || {};
        // Get a reference to the user stats document
        const userStatsRef = admin.firestore().collection('user_stats').doc(userId);
        // Calculate image size (approximation based on URL or use actual size)
        const imageSize = generationData.imageSize || 500 * 1024; // Default 500KB if not specified
        // Update the stats using a transaction
        await admin.firestore().runTransaction(async (transaction) => {
            const userStatsDoc = await transaction.get(userStatsRef);
            if (!userStatsDoc.exists) {
                // Create a new stats document if it doesn't exist
                transaction.set(userStatsRef, {
                    actorsCreated: 1,
                    actorsLimit: 5,
                    imagesGenerated: 1,
                    imagesLimit: 50,
                    storageUsed: imageSize,
                    storageLimit: 500 * 1024 * 1024,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            else {
                // Update existing stats document
                const currentStats = userStatsDoc.data() || {};
                transaction.update(userStatsRef, {
                    imagesGenerated: ((currentStats.imagesGenerated || 0) + 1),
                    storageUsed: ((currentStats.storageUsed || 0) + imageSize),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });
        // Update actor lastUsed field
        await admin.firestore().collection('actors').doc(actorId).update({
            lastUsed: admin.firestore.FieldValue.serverTimestamp()
        });
        // Log activity
        await admin.firestore().collection('user_activity').add({
            type: 'generation',
            userId,
            actorId,
            actorName: actorData.name || 'Unknown Actor',
            prompt: generationData.prompt,
            imageUrl: generationData.imageUrl,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error updating user stats on image generation:', error);
        return { error: 'Failed to update user stats' };
    }
});
// Function to update user stats when model training completes
exports.updateUserStatsOnTrainingComplete = functions.firestore
    .document('actors/{actorId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const actorId = context.params.actorId;
    // Only proceed if the modelStatus field changed to 'completed'
    if (before.modelStatus !== 'completed' &&
        after.modelStatus === 'completed' &&
        after.userId) {
        try {
            // Log activity
            await admin.firestore().collection('user_activity').add({
                type: 'training',
                userId: after.userId,
                actorId,
                actorName: after.name,
                status: 'completed',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error logging training completion:', error);
            return { error: 'Failed to log training completion' };
        }
    }
    return null;
});
// Health check endpoint for monitoring
exports.healthCheck = functions.https.onRequest((request, response) => {
    response.status(200).send({ status: 'ok', timestamp: Date.now() });
});
// Cleanup function to regularly check and enforce storage limits
exports.enforceStorageLimits = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    const usersOverLimit = await admin.firestore()
        .collection('user_stats')
        .where('storageUsed', '>', admin.firestore.FieldValue.increment(0))
        .get();
    const batch = admin.firestore().batch();
    usersOverLimit.forEach(doc => {
        const stats = doc.data();
        // If user is over storage limit
        if (stats.storageUsed > stats.storageLimit) {
            // Add notification for the user
            const notificationRef = admin.firestore().collection('notifications').doc();
            batch.set(notificationRef, {
                userId: doc.id,
                type: 'storage_limit',
                message: 'You have exceeded your storage limit. Please delete some images or upgrade your account.',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    });
    // Commit all notifications
    await batch.commit();
    return null;
});
//# sourceMappingURL=index.js.map