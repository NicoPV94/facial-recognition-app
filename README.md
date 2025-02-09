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

## License

MIT 