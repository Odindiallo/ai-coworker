const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Firebase function that generates an image for an AI actor.
 * 
 * This function:
 * 1. Validates the request (actor exists, model is trained, belongs to user)
 * 2. Calls the Hugging Face API to generate an image
 * 3. Stores the generated image in Firebase Storage
 * 4. Stores metadata in Firestore
 * 5. Returns the image URL and metadata
 */
exports.generateImage = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to generate images'
    );
  }

  const { 
    actorId, 
    prompt,
    negativePrompt = '', 
    guidanceScale = 7.5, 
    numInferenceSteps = 50 
  } = data;
  
  if (!actorId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with an "actorId" argument'
    );
  }

  if (!prompt) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a "prompt" argument'
    );
  }

  try {
    // Get actor document
    const actorRef = admin.firestore().collection('actors').doc(actorId);
    const actorDoc = await actorRef.get();

    // Check if actor exists
    if (!actorDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Actor not found'
      );
    }

    const actorData = actorDoc.data();

    // Check if actor belongs to the requesting user
    if (actorData.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to generate images for this actor'
      );
    }

    // Check if actor's model is trained
    if (actorData.modelStatus !== 'completed') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Actor model is not trained yet'
      );
    }

    // For this demo, we'll simulate image generation
    // In a real application, you would call the Hugging Face API here
    
    // Generate a unique image ID
    const imageId = uuidv4();
    
    // In a real application, this would be the call to Hugging Face
    /*
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${actorData.modelId}`,
      {
        inputs: prompt,
        parameters: {
          negative_prompt: negativePrompt,
          guidance_scale: guidanceScale,
          num_inference_steps: numInferenceSteps
        }
      },
      {
        headers: {
          Authorization: `Bearer ${functions.config().huggingface.api_key}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    
    // Convert response to buffer
    const imageBuffer = Buffer.from(response.data, 'binary');
    
    // Upload to Firebase Storage
    const imagePath = `users/${context.auth.uid}/generated-images/${imageId}.jpg`;
    const file = admin.storage().bucket().file(imagePath);
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg'
      }
    });
    
    // Get download URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '01-01-2100'
    });
    */
    
    // For the demo, we'll use a placeholder image
    // In a real application, this would be the generated image URL
    const url = `https://via.placeholder.com/512x512.jpg?text=${encodeURIComponent(prompt.substring(0, 20))}`;
    const imagePath = `users/${context.auth.uid}/generated-images/${imageId}.jpg`;
    
    // Store the generation in Firestore
    const generationRef = await admin.firestore().collection('generatedImages').add({
      userId: context.auth.uid,
      actorId: actorId,
      prompt: prompt,
      negativePrompt: negativePrompt,
      guidanceScale: guidanceScale,
      numInferenceSteps: numInferenceSteps,
      imageUrl: url,
      imagePath: imagePath,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Return the generation details
    return {
      id: generationRef.id,
      imageUrl: url,
      prompt: prompt
    };
  } catch (error) {
    functions.logger.error('Error generating image', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error generating image: ' + error.message
    );
  }
});

/**
 * Gets all generated images for an actor
 */
exports.getGeneratedImages = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to get generated images'
    );
  }

  const { actorId } = data;
  if (!actorId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with an "actorId" argument'
    );
  }

  try {
    // Get actor document to check ownership
    const actorRef = admin.firestore().collection('actors').doc(actorId);
    const actorDoc = await actorRef.get();

    // Check if actor exists
    if (!actorDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Actor not found'
      );
    }

    const actorData = actorDoc.data();

    // Check if actor belongs to the requesting user
    if (actorData.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to view this actor'
      );
    }

    // Get the generated images
    const imagesQuery = await admin.firestore()
      .collection('generatedImages')
      .where('actorId', '==', actorId)
      .where('userId', '==', context.auth.uid)
      .orderBy('createdAt', 'desc')
      .get();

    // Format the results
    const images = [];
    imagesQuery.forEach(doc => {
      const data = doc.data();
      images.push({
        id: doc.id,
        imageUrl: data.imageUrl,
        prompt: data.prompt,
        createdAt: data.createdAt.toDate().toISOString()
      });
    });

    return { images };
  } catch (error) {
    functions.logger.error('Error fetching generated images', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error fetching generated images: ' + error.message
    );
  }
});