// Health check endpoint for Vercel
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    environment: process.env.VITE_APP_ENV || 'production',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.0'
  });
}
