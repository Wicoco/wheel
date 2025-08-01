# Standup Wheel

A gamified standup meeting tool that randomly selects team members and tracks speaking time with points and achievements.

## Quick Start

```bash
# Install dependencies
npm run install:all

# Start development servers
npm run dev
```

Access the app at http://localhost:5173 (frontend) and http://localhost:5000 (backend).

## Prerequisites

- Node.js 16+
- MongoDB running locally
- npm or yarn

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and configure:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/wicoco-wheel
JWT_SECRET=your-jwt-secret-here
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
ENABLE_SLACK_NOTIFICATIONS=false
DEFAULT_STANDUP_DURATION=60
MAX_SPEAKING_TIME=120
```

## Features

- Random team member selection wheel
- Speaking time tracking with visual timer
- Points system and achievements
- Team management and statistics
- Optional Slack integration
- Sound effects and notifications
- Responsive modern UI

## Development

```bash
# Backend only
cd backend && npm run dev

# Frontend only  
cd frontend && npm run dev

# Install new dependencies
npm run install:backend
npm run install:frontend
```

## Project Structure

```
wicoco-wheel/
├── backend/           # Express.js API server
│   ├── models/        # MongoDB models
│   ├── routes/        # API routes
│   └── services/      # Business logic
└── frontend/          # React + Vite app
    ├── components/    # Reusable components
    ├── pages/         # Page components
    └── services/      # API client
```

## API Endpoints

- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create team
- `GET /api/teams/:id/members` - Get team members
- `POST /api/standup/start` - Start standup session
- `POST /api/standup/next` - Get next speaker

## Slack Integration

Create a Slack app and add bot token to enable:
- Channel member import
- Standup notifications
- Results sharing