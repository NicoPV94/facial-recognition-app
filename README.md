# Facial Authentication Next.js App

This is a Next.js application that implements facial recognition authentication using face-api.js and NextAuth.js.

## Features

- User registration with facial recognition
- Facial authentication login
- Protected dashboard
- PostgreSQL database for user data storage
- Modern UI with Tailwind CSS

## Prerequisites

- Node.js 16.x or later
- PostgreSQL database
- Webcam access

## Setup

1. Clone the repository and install dependencies:

```bash
cd facial-auth-app
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the following variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `NEXTAUTH_SECRET`: Generate a secure random string
     - `NEXTAUTH_URL`: Your application URL (http://localhost:3000 for development)

3. Initialize the database:

```bash
npx prisma generate
npx prisma db push
```

4. Download face-api.js models:
   - Create a `public/models` directory
   - Download the following models from [face-api.js models](https://github.com/justadudewhohacks/face-api.js/tree/master/weights) and place them in the `public/models` directory:
     - `tiny_face_detector_model-weights_manifest.json`
     - `tiny_face_detector_model-shard1`
     - `face_landmark_68_model-weights_manifest.json`
     - `face_landmark_68_model-shard1`
     - `face_recognition_model-weights_manifest.json`
     - `face_recognition_model-shard1`

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Register:
   - Visit `/register`
   - Enter your email and name
   - Allow camera access
   - Look at the camera to capture your facial data
   - Wait for registration confirmation

2. Login:
   - Visit `/login`
   - Enter your email
   - Allow camera access
   - Look at the camera to authenticate
   - You'll be redirected to the dashboard upon successful authentication

## Security Considerations

- Facial recognition data is stored as encrypted descriptors
- HTTPS is recommended for production deployment
- Session management is handled securely by NextAuth.js
- Database credentials and secrets are protected via environment variables

## Local Development with HTTPS

For testing camera functionality on mobile devices in your local network, you'll need HTTPS. Follow these steps:

### Setting up HTTPS for Local Development

1. Generate self-signed SSL certificates:
```bash
mkdir -p certificates && openssl req -x509 -newkey rsa:4096 -keyout certificates/key.pem -out certificates/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

2. Build the application:
```bash
npm run build
```

3. Start the secure server:
```bash
npm run start-secure
```

4. Access the application from other devices using:
```
https://YOUR_LOCAL_IP:3000
```

### Important Security Notes

⚠️ **WARNING: Development SSL Certificates**
- The SSL certificates in the `certificates/` directory are for **local development only**
- Never commit these certificates to version control
- Never use self-signed certificates in production
- The certificates will expire after 365 days

### Before Production Deployment

1. Remove development SSL files:
```bash
rm -rf certificates server.js
```

2. Remove the `start-secure` script from `package.json`

3. Use proper SSL certificates in production:
- If using Vercel, Netlify, or similar platforms, HTTPS is handled automatically
- If self-hosting, use certificates from a trusted provider (e.g., Let's Encrypt)

### Browser Security Warnings

When accessing the development server, you'll see security warnings because of the self-signed certificate:

- **Chrome/Android**: Click "Advanced" → "Proceed to site (unsafe)"
- **Safari/iOS**: Go to Settings → General → About → Certificate Trust Settings → Enable full trust for the certificate

These warnings are normal in development but should never appear in production.

## License

MIT 