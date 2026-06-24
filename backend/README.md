# Mobile App Backend

This is the backend API for the mobile application, built with Next.js. It handles secure operations like payment processing and video hosting authentication.

## Prerequisites

- Node.js installed
- Supabase project
- Razorpay account
- Bunny Stream account

## Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    - Copy `.env.example` to `.env.local` (if not already done).
    - Fill in the required keys in `.env.local`.
    - **IMPORTANT:** You must provide `SUPABASE_SERVICE_ROLE_KEY` for backend operations to work correctly.

## Running the Server

To start the development server:

```bash
npm run dev
```

The server will start at `http://localhost:3000`.

## API Endpoints

-   `POST /api/razorpay/order`: Create a new payment order.
-   `POST /api/razorpay/verify`: Verify payment signature and record purchase.
-   `POST /api/bunny/create`: Create a video entry in Bunny Stream.
-   `POST /api/bunny/sign`: Generate a signed URL for video playback.

## Deployment to Vercel

1.  Push this `backend` folder to a GitHub repository (or the root if monorepo).
2.  Import the project into Vercel.
3.  Add the environment variables in Vercel Project Settings.
4.  Deploy.
5.  Update `EXPO_PUBLIC_API_URL` in your mobile app `.env` to the Vercel deployment URL.
