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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logErrorToCrashlytics = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Crashlytics
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Firebase function that logs errors to Crashlytics
 * Called from the client to record errors and exceptions
 */
exports.logErrorToCrashlytics = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    try {
        // Parse the context if it's a string
        let parsedContext = {};
        if (data.context) {
            try {
                parsedContext = JSON.parse(data.context);
            }
            catch (e) {
                console.error('Failed to parse error context:', e);
                parsedContext = { rawContext: data.context };
            }
        }
        // Create a record of the error in Firestore
        const errorRecord = {
            userId: context.auth.uid,
            errorType: data.name || 'Error',
            message: data.message || 'Unknown error',
            stack: data.stack,
            context: parsedContext,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent: data.userAgent
        };
        await admin.firestore().collection('error_logs').add(errorRecord);
        return { success: true };
    }
    catch (error) {
        console.error('Error logging to Crashlytics:', error);
        throw new functions.https.HttpsError('internal', 'Failed to log error to Crashlytics', error);
    }
});
//# sourceMappingURL=crashlytics.js.map