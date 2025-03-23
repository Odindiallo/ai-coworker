# Google Colab Model Training Integration

This document outlines how to use Google Colab for fine-tuning Stable Diffusion models for the AI Actor Generator application. The integration allows us to leverage Google's free GPU resources for computationally intensive model training without requiring dedicated infrastructure.

## Overview

The AI Actor Generator uses the following workflow for model training:

1. User uploads multiple images via the application
2. Firebase Functions prepare and validate the training data
3. A Google Colab notebook is triggered to perform the actual training
4. The trained model is uploaded to Hugging Face
5. Firebase updates the application with the trained model information

## Setup Requirements

- Google account with access to Google Colab
- Hugging Face account with an API token
- Firebase project with Firestore and Storage enabled
- Service account credentials for Firebase

## Colab Notebook Setup

The following code snippets demonstrate the key components of our Google Colab training notebook.

### 1. Environment Setup

```python
# Install required packages
!pip install -q diffusers==0.21.4 transformers==4.33.2 accelerate==0.23.0 peft==0.5.0
!pip install -q bitsandbytes==0.41.1 gradio==3.41.2 torch==2.0.1
!pip install -q firebase-admin==6.2.0 google-cloud-storage==2.9.0

# Import required libraries
import os
import gc
import json
import torch
import firebase_admin
from firebase_admin import credentials, firestore, storage
from google.cloud import storage as gcs
from diffusers import StableDiffusionPipeline, DDPMScheduler
from peft import LoraConfig, get_peft_model
```

### 2. Firebase Authentication

```python
# Load Firebase credentials
def initialize_firebase():
  # For Colab, we upload the service account JSON as a file
  from google.colab import files
  uploaded = files.upload()
  
  # Use the first uploaded JSON file
  cred_file = next(iter(uploaded))
  
  # Initialize Firebase with the uploaded credentials
  cred = credentials.Certificate(cred_file)
  firebase_admin.initialize_app(cred, {
    'storageBucket': 'ai-based-actors-backup.appspot.com'
  })
  
  return firestore.client(), storage.bucket()

# Call the initialization function
db, bucket = initialize_firebase()
```

### 3. Data Preparation

```python
# Download training images from Firebase Storage
def download_training_images(job_id):
  job_ref = db.collection('training_jobs').doc(job_id)
  job_data = job_ref.get().to_dict()
  
  if not job_data:
    raise ValueError(f"Training job {job_id} not found")
  
  # Create a directory for the training data
  os.makedirs("training_data", exist_ok=True)
  
  # Update job status to 'preparing'
  job_ref.update({
    'status': 'preparing'
  })
  
  # Get actor document to find images
  actor_ref = db.collection('actors').doc(job_data['actorId'])
  actor_data = actor_ref.get().to_dict()
  
  # Get image URLs from actor document
  image_urls = actor_data.get('imageUrls', [])
  
  if len(image_urls) < 5:
    raise ValueError(f"Not enough training images: {len(image_urls)}")
  
  # Download each image
  training_data = []
  for i, url in enumerate(image_urls):
    # Extract file path from URL
    file_path = url.split('?')[0].split('/')[-1]
    
    # Download from Firebase Storage
    blob = bucket.blob(file_path)
    destination = f"training_data/image_{i}.jpg"
    blob.download_to_filename(destination)
    
    # Create caption (for training)
    caption = f"a photo of {job_data['instanceName']}, person"
    
    training_data.append({
      'image_path': destination,
      'caption': caption
    })
  
  return training_data, job_data
```

### 4. Model Training

```python
# Train the model using LoRA fine-tuning
def train_model(job_id, training_data, job_data):
  # Update job status to 'training'
  job_ref = db.collection('training_jobs').doc(job_id)
  job_ref.update({
    'status': 'training',
    'progress': 0
  })
  
  # Load base model
  base_model_id = job_data['baseModelId']
  model = StableDiffusionPipeline.from_pretrained(
    base_model_id,
    torch_dtype=torch.float16
  )
  
  # Configure LoRA (Low-Rank Adaptation)
  lora_config = LoraConfig(
    r=16,                  # rank
    lora_alpha=32,         # scaling factor
    target_modules=["q", "k", "v", "proj_in", "proj_out"],
    lora_dropout=0.1,      # dropout probability
    bias="none"
  )
  
  # Prepare model for training
  unet = model.unet
  unet = get_peft_model(unet, lora_config)
  unet.train()
  
  # Configure training parameters
  training_steps = job_data.get('trainingSteps', 1500)
  batch_size = job_data.get('trainingBatchSize', 4)
  learning_rate = job_data.get('learningRate', 1e-6)
  
  # Training loop
  optimizer = torch.optim.AdamW(unet.parameters(), lr=learning_rate)
  scheduler = DDPMScheduler.from_pretrained(base_model_id, subfolder="scheduler")
  
  # Code for actual training loop would go here
  # This is simplified for the example
  for step in range(training_steps):
    # Training logic
    
    # Update progress every 100 steps
    if step % 100 == 0 or step == training_steps - 1:
      progress = int((step + 1) / training_steps * 100)
      job_ref.update({
        'progress': progress
      })
  
  # Generate model ID
  actor_ref = db.collection('actors').doc(job_data['actorId'])
  instance_name = job_data['instanceName']
  model_id = f"user/{job_data['userId']}/models/{instance_name}"
  
  # Save and upload the trained model
  unet.save_pretrained("./trained_model")
  
  # Upload to Hugging Face (in production) or simulate
  
  # Update job status to 'completed'
  job_ref.update({
    'status': 'completed',
    'progress': 100,
    'trainedModelId': model_id
  })
  
  # Update actor document
  actor_ref.update({
    'modelStatus': 'completed',
    'modelId': model_id
  })
  
  return model_id
```

### 5. Main Execution Flow

```python
# Main function to run when triggered
def run_training_job(job_id):
  try:
    # Download training images
    training_data, job_data = download_training_images(job_id)
    
    # Train the model
    model_id = train_model(job_id, training_data, job_data)
    
    print(f"Training completed successfully. Model ID: {model_id}")
    return True
  except Exception as e:
    print(f"Error during training: {str(e)}")
    
    # Update job status to 'failed'
    job_ref = db.collection('training_jobs').doc(job_id)
    job_ref.update({
      'status': 'failed',
      'error': str(e)
    })
    
    # Update actor document
    actor_ref = db.collection('actors').doc(job_data['actorId'])
    actor_ref.update({
      'modelStatus': 'failed',
      'modelError': str(e)
    })
    
    return False

# Get job ID from user input for testing
job_id = input("Enter the training job ID: ")
run_training_job(job_id)
```

## Integration with Firebase

To integrate this Colab notebook with our Firebase Functions, we have two main approaches:

### 1. Manual Trigger Method

In this approach:
1. The Firebase Function creates a training job in Firestore
2. An administrator or the user manually runs the Colab notebook
3. The notebook requests a job ID to process
4. The notebook updates the job status in Firestore

This approach is simpler but requires manual intervention.

### 2. Automated Trigger Method

For a more automated approach:
1. The Firebase Function creates a training job in Firestore
2. A scheduled Cloud Function checks for pending jobs
3. When a job is found, it triggers a Colab notebook using the Colab API
4. The notebook processes the job and updates the status

This requires additional setup with Google Cloud and the Colab API.

## Production Configuration

For a production environment, consider these improvements:

1. **Dedicated GPU Resources**: Move from Colab to a dedicated GPU instance on Google Cloud, AWS, or similar
2. **Queue Management**: Implement a proper job queue with priorities
3. **Error Handling**: Add robust error handling and recovery mechanisms
4. **Progress Monitoring**: Implement more detailed progress tracking
5. **Model Versioning**: Add proper model versioning and metadata

## Security Considerations

1. **Service Account**: Use a service account with limited permissions
2. **API Keys**: Securely store API keys and tokens
3. **Data Access**: Limit access to training data
4. **Model Access**: Control who can access trained models

## Implementation Note

This integration is simplified for demonstration purposes. In a production environment, you would need to handle:

1. GPU availability in Colab
2. Session timeouts
3. More robust error recovery
4. Proper model hosting

## Testing the Integration

1. Create a training job through the app
2. Note the job ID
3. Open the Colab notebook
4. Enter the job ID when prompted
5. Monitor the training process

The notebook will update the job status in Firebase, and the app will reflect these updates in real-time.
