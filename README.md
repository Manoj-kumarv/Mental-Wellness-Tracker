# 🌿 MindEase — AI Mental Wellness Tracker

An AI-powered mental wellness companion for students preparing for competitive exams (NEET, JEE, CUET, CAT, GATE, and UPSC) built entirely on AWS.

---

## ⚠️ Important Safety Disclaimer

**MindEase is NOT a medical tool, therapy service, or mental health diagnostic system.**
It is an AI-powered wellness awareness companion designed to support student wellbeing during exam preparation.

For professional mental health support:
- **iCall (TISS):** 9152987821
- **Vandrevala Foundation:** 1860-2662-345 (24/7)
- **iCall WhatsApp:** icallhelpline.org

---

## 🎯 Problem Statement

Students preparing for high-stakes competitive exams in India face unique, intense pressures:
- 12-16 hour daily study routines
- Constant peer comparison and ranking anxiety
- Parental pressure and financial stakes
- Social isolation during preparation years
- Fear of failure with limited second chances

Standard wellness apps don't understand this context. MindEase does.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MindEase System                          │
│   Frontend (S3 + CloudFront)    │     Backend (FastAPI on EB)   │
│   React + TypeScript + CSS      │     JWT Auth + Bcrypt         │
│   Zustand (State)               │     Pydantic Validation       │
└─────────────────────────────────┴───────────────────────────────┘
               │                            │
               └────────────── API ─────────┘
                                            │
               ┌────────────────────────────┼────────────────────┐
               │                            │                    │
          DynamoDB                     AWS Bedrock         Secrets Manager
    (Single-Table NoSQL)            (Claude 3 inference)    (JWT Key Cache)
               │                      (ai_service.py)           │
               │                                                 │
     ┌──────────────────┐                               ┌──────────────────┐
     │   Access Keys    │                               │  Managed Secrets │
     │ • USER#{user_id} │                               │ • JWT_SECRET_KEY │
     │ • SESSION#{id}   │                               └──────────────────┘
     │ • JOURNAL#{id}   │
     │ • MOOD#{id}      │
     │ • CHAT#{id}      │
     └──────────────────┘
```

---

## 🔐 Authentication Model

MindEase supports two entry modes to maximize accessibility while maintaining security:

### 1. Guest User (Critical Path)
- **One-click access** — "Continue as Guest" on landing page or auth page
- Backend generates a cryptographically secure session ID (e.g., `guest_ABC123...`)
- Session ID is signed into a **JWT** with 24-hour expiry
- Token stored in `localStorage` + `HttpOnly cookie`
- All guest data is **isolated** — stored under the unique session ID
- Guest data persists for 24 hours (session lifetime)
- **No email, no password, no registration required**
- Full access to: journaling, mood logging, AI chat, weekly insights

### 2. Authenticated User
- Email + password signup/login
- Passwords hashed with **bcrypt** (salt rounds: 12)
- JWT-based authentication (7-day expiry)
- Data persists indefinitely across sessions
- Same features as guest, with persistent history

---

## 🤖 AI Implementation (AWS Bedrock)

### 1. Journal Analysis (`POST /ai/analyze-journal`)
Powered by `anthropic.claude-3-haiku` via AWS Bedrock.
- Detects emotions from free-text journal entries
- Identifies specific stress triggers (exam anxiety, syllabus overwhelm, etc.)
- Extracts recurring behavioral patterns
- Suggests 3-5 context-specific coping strategies
- Generates a 2-3 minute mindfulness exercise
- Returns structured JSON response

### 2. Conversational AI Companion (`POST /ai/chat`)
- Maintains conversation history (last 10 messages as context)
- Injects user context: recent journal excerpt, current mood, current stress level, exam type
- Detects crisis keywords and injects helpline numbers automatically
- Bedrock Converse API multi-turn chat

### 3. Weekly Insight Generator (`GET /ai/weekly-insights`)
- Aggregates last 7 days of journal entries + mood logs
- Passes data to Bedrock for pattern analysis
- Returns structured weekly insight report (mood trends, dominant emotions, areas of concern, actionable advice)

---

## 🔒 Security

| Feature | Implementation |
|---------|----------------|
| Password hashing | bcrypt via passlib |
| JWT tokens | python-jose with HS256 |
| HttpOnly cookies | Dual storage (header + cookie) |
| CORS | Configured per-origin, no wildcard in production |
| Rate limiting | slowapi — 60/min general, 20/min for AI endpoints |
| Secrets | AWS Secrets Manager (JWT key) — never in code |
| Input validation | Pydantic v2 strict schemas |
| Guest isolation | Session IDs are cryptographically random, ownership-checked on every query |

---

## ☁️ AWS Services

| Service | Usage |
|---------|-------|
| **Elastic Beanstalk** / **EC2** | Host FastAPI backend server instances |
| **S3** | Host static React frontend builds + store private/public assets |
| **CloudFront** | Global CDN for low-latency frontend delivery |
| **DynamoDB** | Single-table NoSQL database for all entity persistence |
| **Secrets Manager** | Store JWT secrets and database configuration credentials |
| **AWS Bedrock** | GenAI Inference using Claude 3 Haiku and Titan models |
| **ACM** | Provision public SSL certificates for custom domains |
| **Route 53** | Map frontend domains and backend API endpoints |
| **CloudWatch** | Monitor application health and store stdout logs |

---

## 📁 Project Structure

```
Mental-Wellness-Tracker/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, middleware, routes
│   │   ├── config.py            # Centralized settings (pydantic-settings)
│   │   ├── core/
│   │   │   ├── security.py      # JWT, bcrypt, session IDs
│   │   │   └── dependencies.py  # FastAPI dependency injection
│   │   ├── db/
│   │   │   └── dynamodb.py      # DynamoDB resource & bootstrapping
│   │   ├── models/
│   │   │   └── schemas.py       # All Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── auth.py          # /auth/* endpoints
│   │   │   ├── journal.py       # /journal/* endpoints
│   │   │   ├── mood.py          # /mood/* endpoints
│   │   │   ├── ai.py            # /ai/* endpoints
│   │   │   └── s3.py            # S3 pre-signed upload URLs
│   │   ├── services/
│   │   │   ├── ai_service.py    # AWS Bedrock Converse API integration
│   │   │   ├── user_service.py  # DynamoDB User CRUD
│   │   │   ├── journal_service.py
│   │   │   ├── mood_service.py
│   │   │   ├── chat_service.py
│   │   │   ├── s3_service.py    # S3 client and pre-sign URLs helper
│   │   │   └── secrets_service.py # AWS Secrets Manager integration
│   │   └── middleware/
│   │       └── logging.py       # Request logging middleware
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Routes + protected routes
│   │   ├── main.tsx             # React entry + Toaster
│   │   ├── index.css            # styling
│   │   ├── api/                 # Typed API clients
│   │   │   ├── client.ts        # Axios + interceptors
│   │   │   ├── auth.ts
│   │   │   ├── journal.ts
│   │   │   ├── mood.ts
│   │   │   └── ai.ts
│   │   ├── store/
│   │   │   └── authStore.ts     # Zustand auth state
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx  # Public landing + guest CTA (AWS branded)
│   │   │   ├── AuthPage.tsx     # Login/signup + guest option
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── JournalPage.tsx  # Journal entry + Bedrock analysis
│   │   │   ├── MoodPage.tsx     # Mood logging + charts
│   │   │   ├── ChatPage.tsx     # AI companion chat (AWS branded)
│   │   │   └── InsightsPage.tsx # Weekly emotional insights
│   │   └── components/
│   │       ├── Layout.tsx       # Sidebar + mobile nav
│   │       ├── LoadingSpinner.tsx
│   │       └── SafetyBanner.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── .env.example
├── deploy/
│   ├── cloudformation.yaml     # Infrastructure Stack (DynamoDB, S3, IAM)
│   └── deployment_guide.md     # Step-by-step deployment guide
├── docker-compose.yml          # Local development stack
└── README.md
```

---

## 🚀 Deployment Instructions

Refer to the detailed [AWS Deployment Guide](file:///d:/Mental-Wellness-Tracker/deploy/deployment_guide.md) for step-by-step deployment setups.

### Local Development

1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   # Copy config template
   cp .env.example .env
   # Update variables (e.g. AWS credentials or DynamoDB Local endpoint)
   uvicorn app.main:app --reload --port 8080
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```

3. **Docker Compose**:
   ```bash
   docker-compose up --build
   ```
