# 🎯 AI-Powered Voice and USSD Research Information System

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://postgresql.org/)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-AI%20Platform-orange.svg)](https://cloud.google.com/)
[![Africa's Talking](https://img.shields.io/badge/Africa's%20Talking-API-red.svg)](https://africastalking.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive, production-ready system that enables researchers to collect data through USSD (*384*34153#) and voice interactions using Africa's Talking APIs, with **Google Gemini AI-powered** transcription and intelligent summarization.

## 🌟 Key Features

- 📱 **USSD Interface** - Interactive menu system via *384*34153#
- 📞 **Voice Recording** - Automated calls with AI transcription
- 🤖 **Google Gemini AI** - Advanced text analysis and summarization
- 🎤 **Google Speech-to-Text** - High-accuracy voice transcription
- 🌍 **Multilingual Support** - English & Swahili interfaces
- 📊 **Real-time Analytics** - Comprehensive research dashboard
- 🔒 **Enterprise Security** - JWT auth, rate limiting, encryption
- 🐳 **Docker Ready** - One-command deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+ (or SQLite for development)
- Google Cloud Platform account
- Africa's Talking account

### 1. Installation

```bash
git clone https://github.com/your-username/research-voice-system.git
cd research-voice-system
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Google Cloud AI Configuration
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLOUD_KEY_FILE=credentials/google-credentials.json
GOOGLE_PROJECT_ID=your_google_project_id

# Africa's Talking Configuration
AT_USERNAME=sandbox
AT_API_KEY=your_africastalking_api_key

# Database Configuration
DB_HOST=localhost
DB_NAME=research_system
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. Google Cloud Setup

```bash
# Create service account and download credentials
gcloud iam service-accounts create research-voice-service
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:research-voice-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/speech.admin"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:research-voice-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
gcloud iam service-accounts keys create credentials/google-credentials.json \
  --iam-account=research-voice-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 4. Database Setup

**Option A: Automatic Setup (Recommended)**
```bash
# Run migrations and seed data in one command
npm run db:reset
```

**Option B: Step by Step**
```bash
# 1. Run database migrations (create tables)
npm run db:migrate

# 2. Seed database with sample data
npm run db:seed
```

**Option C: Manual PostgreSQL Setup**
```bash
# Connect to PostgreSQL and create database
psql -U postgres
CREATE DATABASE research_system;
\q

# Then run migrations
npm run db:migrate
npm run db:seed
```

**Verify Database Setup:**
```bash
# Check if tables were created successfully
psql -U postgres -d research_system -c "\dt"

# View sample data
psql -U postgres -d research_system -c "SELECT COUNT(*) FROM research_questions;"
```

### 5. Start Development Server

```bash
npm run dev
```

Your server will be running at `http://localhost:3000`

## 🏗️ System Architecture

```mermaid
graph TB
    A[USSD Users *384*34153#] --> D[Nginx Proxy]
    B[Voice Users 📞] --> D
    C[Researchers 🖥️] --> D
    
    D --> E[Node.js Application]
    
    E --> F[USSD Service]
    E --> G[Voice Service] 
    E --> H[AI Service]
    
    H --> I[Google Gemini AI]
    H --> J[Google Speech-to-Text]
    
    E --> K[(PostgreSQL Database)]
    E --> L[Africa's Talking APIs]
    
    style I fill:#4285f4,stroke:#333,stroke-width:2px,color:#fff
    style J fill:#4285f4,stroke:#333,stroke-width:2px,color:#fff
```

## 📱 USSD Flow Example

```
User dials: *384*34153#

┌─────────────────────────────────────┐
│ Research Information System         │
│                                     │
│ 1. Research Information             │
│ 2. Answer Research Questions        │
│ 3. Record Voice Response            │
│ 4. Listen to Research Summary       │
│ 5. Change Language / Badili Lugha   │
│ 0. Exit                             │
└─────────────────────────────────────┘

User selects: 2

┌─────────────────────────────────────┐
│ Select a question to answer:        │
│                                     │
│ 1. Community Health                 │
│ 2. Education Access                 │
│ 3. Economic Opportunities           │
│ 0. Back to Main Menu                │
└─────────────────────────────────────┘
```

## 🤖 AI Processing Pipeline

```mermaid
graph LR
    A[Voice Recording] --> B[Google Speech-to-Text]
    B --> C[Text Preprocessing]
    C --> D[Google Gemini AI]
    D --> E[Summary Generation]
    D --> F[Key Points Extraction]
    D --> G[Sentiment Analysis]
    D --> H[Theme Identification]
    E --> I[(Database Storage)]
    F --> I
    G --> I
    H --> I
```

## 🔧 API Endpoints

### USSD Endpoints
```http
POST /ussd/callback
Content-Type: application/x-www-form-urlencoded

sessionId=test123&serviceCode=*384*34153#&phoneNumber=+254712345678&text=
```

### Voice Endpoints
```http
POST /voice/callback
POST /voice/recording
POST /voice/status
```

### API Endpoints
```http
GET /api/health
GET /api/questions
GET /api/responses
GET /api/analytics
```

### SMS Endpoints
```http
POST /sms/thank-you      # Send thank you SMS (Admin/Researcher)
POST /sms/invite         # Send research invitations (Admin/Researcher)  
POST /sms/bulk           # Send bulk SMS (Admin only)
GET /sms/statistics      # Get SMS statistics
POST /sms/delivery-report # SMS delivery webhook
```

## 🧪 Testing

### Test USSD with Postman

1. **Initial Request (Main Menu)**
```http
POST http://localhost:3000/ussd/callback
Content-Type: application/x-www-form-urlencoded

sessionId=test123
serviceCode=*384*34153#
phoneNumber=+254712345678
text=
```

2. **Select Research Questions**
```http
POST http://localhost:3000/ussd/callback
Content-Type: application/x-www-form-urlencoded

sessionId=test123
serviceCode=*384*34153#
phoneNumber=+254712345678
text=2
```

### Run Test Suite
```bash
npm test                    # Run all tests
npm run test:coverage       # Run with coverage
npm run test:integration    # Integration tests
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
# Build production image
docker build -t research-system .

# Run with production config
docker run -d \
  --name research-system \
  -p 3000:3000 \
  --env-file .env.production \
  research-system
```

## 📊 Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| 📱 USSD Interface | ✅ | Interactive menu system |
| 📞 Voice Recording | ✅ | Automated call system |
| 🤖 Gemini AI | ✅ | Text analysis & summaries |
| 🎤 Speech-to-Text | ✅ | Google Cloud STT |
| 🌍 Multilingual | ✅ | English & Swahili |
| 📊 Analytics | ✅ | Real-time dashboard |
| 🔒 Security | ✅ | JWT, rate limiting |
| 🐳 Docker | ✅ | Container deployment |

## 🗄️ Database Schema

The system uses PostgreSQL with the following main tables:

| Table | Purpose |
|-------|---------|
| `users` | System administrators and researchers |
| `research_questions` | Survey questions (multilingual) |
| `research_responses` | User responses via USSD/Voice |
| `ussd_sessions` | USSD session management |
| `voice_calls` | Voice call tracking |
| `transcriptions` | AI speech-to-text results |
| `ai_summaries` | Gemini AI analysis results |
| `research_campaigns` | Research project management |
| `participants` | User demographics (optional) |

### Database Commands

```bash
# Setup database from scratch
npm run db:migrate    # Create all tables and indexes
npm run db:seed       # Add sample questions and admin user

# Quick reset (development)
npm run db:reset      # Drop, recreate, and seed

# Production backup
pg_dump research_system > backup_$(date +%Y%m%d).sql
```

## 🌍 Multilingual Support

The system supports multiple languages with easy extensibility:

- **English** - Complete interface and voice prompts
- **Swahili** - Full translation for East African users
- **Dynamic Language Switching** - Users can change language mid-session

## 📈 Performance Metrics

- **USSD Response Time:** < 2 seconds
- **Voice Processing:** < 30 seconds with Gemini AI
- **Concurrent Users:** 1000+ USSD sessions
- **Transcription Accuracy:** 95%+ with Google Speech-to-Text
- **Uptime Target:** 99.9%

## 🔒 Security Features

- **JWT Authentication** with secure token management
- **Rate Limiting** on all endpoints (configurable)
- **Input Validation** and sanitization
- **SQL Injection Prevention** with parameterized queries
- **XSS Protection** with Helmet.js security headers
- **HTTPS Enforcement** in production
- **Role-based Access Control** (Admin/Researcher/Viewer)

## 📚 Documentation

- [API Documentation](docs/API.md) - Complete API reference
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Testing Guide](docs/TESTING.md) - Testing procedures

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint
npm run db:migrate   # Run database migrations (create tables)
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database (migrate + seed)
npm run worker:ai    # Start AI processing worker
```

### Database Management

```bash
# Create database tables
npm run db:migrate

# Add sample research questions and admin user
npm run db:seed

# Reset entire database (drop + recreate + seed)
npm run db:reset

# Backup database (PostgreSQL)
pg_dump research_system > backup.sql

# Restore database (PostgreSQL)
psql research_system < backup.sql
```

### Project Structure

```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── middleware/      # Express middleware
├── routes/          # API routes
├── database/        # Database config & migrations
├── utils/           # Utility functions
└── views/           # EJS templates

docs/               # Documentation
credentials/        # Google Cloud credentials
uploads/           # File uploads
logs/              # Application logs
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Contact

- **Documentation:** Check the `/docs` folder
- **Issues:** [Create GitHub Issues](https://github.com/your-username/research-voice-system/issues)
- **Email:** support@research-system.com

---

**🌍 Built for African Researchers** • **🤖 Powered by Google AI** • **🚀 Production Ready**#   r e s e a r c h - a s s i s t e n c e - b a c k 
 
 