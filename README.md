# AI Actor Image Generation Web Application

A web application that allows users to create personalized AI actors by uploading their own images and then generating new images of these actors using text prompts.

## Features

- **User Authentication**: Secure sign-up, login, and account management
- **AI Actor Creation**: Upload photos to create personalized AI actors
- **Model Training**: Train AI models on user-uploaded images
- **Image Generation**: Generate new images using text prompts
- **Mobile-First Design**: Optimized for smartphones and tablets

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage, Functions)
- **AI Models**: Hugging Face AI models for image generation
- **Hosting**: Vercel

## Prerequisites

- Node.js (v18.x or later)
- npm (v9.x or later)
- Firebase account
- Hugging Face account (for model deployment)

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ai-actor-generator.git
   cd ai-actor-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   VITE_HUGGINGFACE_TOKEN=your_huggingface_token
   ```

### Development

Run the development server:
```bash
npm run dev
```

The application will be available at http://localhost:5173

### Build

Create a production build:
```bash
npm run build
```

### Testing

Run tests:
```bash
npm test
```

## Project Structure

```
ai-actor-generator/
├── public/               # Static assets
├── src/
│   ├── assets/           # Images, fonts, etc.
│   ├── components/       # Reusable components
│   │   ├── auth/         # Authentication components
│   │   ├── actors/       # Actor creation components
│   │   ├── generation/   # Image generation components
│   │   ├── gallery/      # Image gallery components
│   │   ├── layout/       # Layout components
│   │   └── ui/           # Basic UI components
│   ├── context/          # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and services
│   ├── pages/            # Page components
│   └── styles/           # Global styles
├── .env                  # Environment variables
├── scripts/           # Utility scripts
│   ├── deploy-rules.sh    # Script for deploying Firebase security rules
│   └── test-permissions.sh # Script for testing Firebase permissions
└── ...                   # Configuration files
```

## Firebase Setup

1. Create a new Firebase project
2. Enable Authentication (Email/Password)
3. Set up Firestore database
4. Configure Storage (see [Firebase Storage Setup Guide](docs/FIREBASE-STORAGE-SETUP.md))
5. Set up Firebase Functions (if needed)

### Storage Setup

To help set up Firebase Storage and configure CORS, use the provided utility script:

```bash
# Make the script executable
chmod +x scripts/setup-storage.sh

# Run the storage setup script
./scripts/setup-storage.sh
```

This script will:
- Guide you through setting up Firebase Storage in the console
- Deploy your storage security rules
- Configure CORS for Firebase Storage (if gsutil is available)
- Provide manual instructions if automatic configuration isn't possible

### Firebase Security Rules

The application uses Firebase Security Rules to protect data. You can deploy the rules using the provided utility script:

```bash
# Navigate to the project root
cd ai-actor-generator

# Make scripts executable if needed
chmod +x scripts/deploy-rules.sh
chmod +x scripts/test-permissions.sh

# Deploy Firebase rules
./scripts/deploy-rules.sh
```

### Testing Firebase Permissions

You can test Firebase permissions to verify your security rules are working correctly:

```bash
# Navigate to the project root
cd ai-actor-generator

# Run the permission test script
./scripts/test-permissions.sh
```

The test script will:
- Check permissions for reading and writing to all collections
- Test storage upload permissions
- Provide a detailed report of any permission issues

For detailed information on handling Firebase permissions in this application, please refer to the [Firebase Permissions Guide](docs/FIREBASE-PERMISSIONS.md).

## Deployment

The application can be deployed to Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy

## Mobile Optimization

This application follows a mobile-first approach:

- Touch-friendly UI elements (minimum 44x44px touch targets)
- Responsive design for all screen sizes
- Performance optimization for mobile networks
- Offline support where applicable

## License

[MIT License](LICENSE)
