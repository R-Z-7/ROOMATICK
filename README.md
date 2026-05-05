# FlatFlow

*Shared chores without the awkward reminders.*

FlatFlow is a Next.js 15 web application designed for roommates and flatmates to seamlessly manage shared house chores, featuring one-time invite links, automated task rotation, and anonymous "Bin Full" alerts.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend & Auth**: Firebase (Authentication, Firestore Database)
- **Deployment**: Vercel (Hobby Tier)

## Deployment Steps

1. **Firebase Setup**:
   - Create a project in the Firebase Console.
   - Enable **Authentication** (Google Sign-In Provider).
   - Enable **Firestore Database**.
   - Deploy the security rules locally by running: `firebase deploy --only firestore:rules`

2. **Environment Variables**:
   - Rename `.env.example` to `.env.local`.
   - Populate the variables with your Firebase project config.

3. **Vercel Deployment**:
   - Push this repository to GitHub.
   - Import the project into Vercel.
   - Add the exact variables from `.env.example` into Vercel's Environment Variables panel.
   - Deploy.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.
