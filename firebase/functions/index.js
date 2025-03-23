const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Import function modules
const { trainModel, simulateTraining } = require('./trainModel');
const { generateImage, getGeneratedImages } = require('./generateImage');

// Export all functions
exports.trainModel = trainModel;
exports.simulateTraining = simulateTraining;
exports.generateImage = generateImage;
exports.getGeneratedImages = getGeneratedImages;

// Optional: Add a function for logging and debugging
exports.logEvent = functions.https.onCall((data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    return { error: 'Authentication required' };
  }
  
  // Log the event
  functions.logger.info('User event logged', {
    userId: context.auth.uid,
    eventType: data.eventType,
    eventData: data.eventData,
    timestamp: new Date().toISOString()
  });
  
  return { success: true };
});
