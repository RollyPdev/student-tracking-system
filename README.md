# Student Location Tracking System

A high-precision, real-time student tracking system built with Next.js, TypeScript, and Leaflet.

## Features

- **📍 Real-time Tracking**: High-accuracy GPS tracking via Web Geolocation API.
- **🗺️ Interactive Map**: Live markers and student activity monitoring for admins.
- **🔐 Role-Based Auth**: Secure access for Students, Teachers, and Admins via NextAuth.
- **📱 Mobile Ready**: Premium, responsive UI designed for mobile devices.
- **🗂️ Class Management**: Filter and organize students by class or section.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **Maps**: Leaflet / React-Leaflet
- **Icons**: Lucide React

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="your_postgresql_url"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_secret_key"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 5. Run Development Server
```bash
npm run dev
```

## Demo Credentials
- **Student**: `student@tracking.com` / `password123`
- **Admin**: `admin@tracking.com` / `password123`

## Privacy & Security
- Location access is explicitly requested from users via browser permissions.
- Data is only visible to authorized Teachers and Admins.
- Students can only view their own tracking status.
