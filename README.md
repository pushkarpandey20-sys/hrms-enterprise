# HRMS Enterprise — Full-Stack HR Management System

> Production-grade HR platform with GPS attendance, payroll, leave management, asset tracking, and real-time analytics.

## Quick Start

```bash
# 1. Clone and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# 2. Start all services
docker-compose up -d

# 3. Run database migrations + seed
docker exec hrms_backend npx prisma migrate deploy
docker exec hrms_backend npm run prisma:seed

# 4. Access the application
# Web:     http://localhost:3000
# API:     http://localhost:5000
# Prisma:  docker exec -it hrms_backend npx prisma studio
```

## Default Credentials
- **Email:** admin@acmecorp.com
- **Password:** Admin@123

## Architecture

```
hrms/
├── backend/          # Node.js + Express + Prisma API
│   ├── prisma/       # Database schema + migrations + seed
│   └── src/
│       ├── modules/  # auth | employees | attendance | leave | payroll | assets | reports
│       ├── shared/   # middleware | utils | validators
│       ├── config/   # database | redis | cloudinary | multer
│       ├── sockets/  # Socket.io real-time server
│       └── jobs/     # Bull queue for background payroll processing
├── frontend/         # React 18 + TypeScript + Vite + Tailwind
│   └── src/
│       ├── pages/    # All module pages
│       ├── components/ # UI + layout + charts
│       ├── stores/   # Zustand state management
│       └── services/ # Typed API layer
├── mobile/           # Expo SDK 51 React Native
│   └── app/
│       ├── auth/     # Login + biometric
│       └── (tabs)/   # Dashboard | Attendance | Leave | Payslips | Profile
├── nginx/            # Reverse proxy config
└── docker-compose.yml
```

## Key Features

### Attendance (4 methods)
- **GPS** — Selfie + location, geo-fence validation
- **WiFi** — Auto-detect whitelisted SSID
- **Face** — AWS Rekognition / face-api.js verification
- **Manual** — HR admin override

### Payroll Engine
- Configurable components (Basic, HRA, DA, PF, ESI, PT, TDS)
- LOP auto-calculation from attendance
- PDF payslip generation + email delivery
- One-click bulk payroll run

### Tech Stack
- **Backend:** Node.js, Express, PostgreSQL, Prisma, Redis, Bull, Socket.io
- **Frontend:** React 18, TypeScript, Vite, Tailwind, Zustand, TanStack Query, Recharts
- **Mobile:** Expo SDK 51, React Native, expo-camera, expo-location
- **Infrastructure:** Docker, Nginx, Cloudinary, Twilio, NodeMailer
