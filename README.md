# AI-Powered Voice and USSD Research Information System

A comprehensive, production-ready system that enables researchers to collect data through USSD (*123*345#) and voice interactions using Africa's Talking APIs, with AI-powered transcription and intelligent summarization.

## 🎯 System Overview

This system enables researchers and participants to:

**Via USSD (*123*345#):**
- Access research information
- Select and answer research questions
- Request voice interactions
- Navigate multilingual menus (English/Swahili)

**Via Voice Calls (IVR):**
- Receive automated calls
- Answer questions verbally
- Record interview responses
- Get spoken summaries

**AI Processing Pipeline:**
- Automatic speech-to-text conversion (OpenAI Whisper)
- NLP analysis and summarization (GPT models)
- Key point extraction and theme identification
- Sentiment analysis and confidence scoring

**Researcher Dashboard:**
- Secure web interface for data analysis
- Real-time analytics and visualizations
- Export capabilities (PDF/CSV)
- User management and campaign tracking

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   USSD Users    │    │   Voice Users    │    │   Researchers   │
│   *123*345#     │    │  📞 Calls        │    │  🖥️ Dashboard   │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                         │
│                   (SSL, Rate Limiting)                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │  USSD   │ │  Voice  │ │   Web   │
    │Handler  │ │Handler  │ │Dashboard│
    └─────────┘ └─────────┘ └─────────┘
          │           │           │
          └───────────┼───────────┘
                      ▼
    ┌─────────────────────────────────────┐
    │         Node.js Application         │
    │  ┌─────────┐ ┌─────────┐ ┌────────┐ │
    │  │  USSD   │ │  Voice  │ │   AI   │ │
    │  │Service  │ │Service  │ │Service │ │
    │  └─────────┘ └─────────┘ └────────┘ │
    └─────────────────┬───────────────────┘
                      │
    ┌─────────────────┼───────────────────┐
    ▼                 ▼                   ▼
┌─────────┐    ┌─────────────┐    ┌─────────────┐
│PostgreSQL│    │Africa's     │    │   OpenAI    │
│Database │    │Talking APIs │    │   APIs      │
└─────────┘    └─────────────┘    └─────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Africa's Talking account
- OpenAI API key

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd voice-ussd-research-system
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Setup database:**
```bash
npm run db:migrate
npm run db:seed
```

4. **Start development server:**
```bash
npm run dev
```

5. **For production deployment:**
```bash
docker-compose up -d
```

## 📋 Features

### ✅ USSD Module (Africa's Talking)
- **Menu-driven interface** with intuitive navigation
- **Session management** with graceful error handling
- **Multilingual support** (English & Swahili)
- **Question selection** and response collection
- **Voice call triggering** from USSD menu

### ✅ Voice/IVR Module (Africa's Talking Voice API)
- **Automated outbound calls** with TTS prompts
- **Interactive voice menus** with DTMF input
- **Voice recording** with configurable duration
- **Multilingual voice prompts** and responses
- **Call status tracking** and analytics

### ✅ AI Processing Pipeline
- **Speech-to-Text** using OpenAI Whisper API
- **Text preprocessing** and cleaning
- **AI summarization** with GPT models
- **Key point extraction** and theme analysis
- **Sentiment analysis** and confidence scoring
- **Batch processing** for scalability

### ✅ Researcher Dashboard
- **Secure authentication** with JWT tokens
- **Real-time analytics** and visualizations
- **Response management** with filtering and search
- **Data export** (PDF, CSV, JSON formats)
- **User management** and role-based access
- **Campaign tracking** and question management

### ✅ Production Features
- **Docker containerization** for easy deployment
- **Nginx reverse proxy** with SSL termination
- **Rate limiting** and security headers
- **Comprehensive logging** with Winston
- **Health checks** and monitoring
- **Database migrations** and seeding
- **Automated backups** and recovery

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
BASE_URL=https://your-domain.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=research_system
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Africa's Talking
AT_USERNAME=your_username
AT_API_KEY=your_api_key
AT_SHORTCODE=your_shortcode
AT_VOICE_NUMBER=your_voice_number

# USSD Configuration
USSD_CODE=*123*345#
USSD_SERVICE_CODE=123*345

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo

# Security
JWT_SECRET=your_jwt_secret
BCRYPT_ROUNDS=12
```

### Africa's Talking Setup

1. **USSD Configuration:**
   - Callback URL: `https://your-domain.com/ussd/callback`
   - Service Code: `*123*345#`

2. **Voice Configuration:**
   - Callback URL: `https://your-domain.com/voice/callback`
   - Recording Callback: `https://your-domain.com/voice/recording`

## 📊 Sample USSD Flow

```
User dials: *123*345#

Response:
CON Research Information System
1. Research Information
2. Answer Research Questions  
3. Record Voice Response
4. Listen to Research Summary
5. Change Language / Badili Lugha
0. Exit

User inputs: 2

Response:
CON Select a question to answer:
1. How do you rate healthcare services?
2. What are your main challenges?
3. Suggestions for improvement?
0. Back to Main Menu

User inputs: 1

Response:
CON How do you rate healthcare services in your area?

Please type your answer:

User inputs: Healthcare is good but needs more doctors

Response:
END Thank you! Your response has been saved.
```

## 📞 Sample Voice Flow

```
1. System calls user automatically
2. "Welcome to the Research Information System"
3. "Press 1 to answer questions, Press 2 for information"
4. User presses 1
5. "Please answer the following question after the beep"
6. "How do you rate healthcare services in your area?"
7. *BEEP* - User speaks for up to 2 minutes
8. "Thank you for your response. Your answer has been recorded."
9. Call ends, AI processing begins automatically
```

## 🤖 AI Processing Workflow

```
Voice Recording → Speech-to-Text → NLP Analysis → Summary Generation
                                      ↓
Key Points ← Sentiment Analysis ← Theme Extraction ← Text Processing
     ↓
Database Storage ← Confidence Scoring ← Quality Assessment
```

## 📈 Analytics & Reporting

- **Real-time dashboards** with response trends
- **Participant demographics** and engagement metrics  
- **Question performance** analysis
- **AI processing statistics** and confidence scores
- **Export capabilities** for external analysis
- **Custom date ranges** and filtering options

## 🔒 Security Features

- **JWT authentication** with secure token management
- **Rate limiting** on all endpoints
- **Input validation** and sanitization
- **SQL injection** prevention
- **XSS protection** with helmet.js
- **HTTPS enforcement** in production
- **Role-based access control** (Admin/Researcher/Viewer)

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale application
docker-compose up -d --scale app=3

# Stop services
docker-compose down
```

## 📚 Documentation

- [API Documentation](docs/API.md) - Complete API reference
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Testing Guide](docs/TESTING.md) - Testing procedures
- [Architecture Guide](docs/ARCHITECTURE.md) - System design

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## 🔄 Development Workflow

```bash
# Start development
npm run dev

# Run linting
npm run lint:fix

# Database operations
npm run db:reset

# Start AI worker
npm run worker:ai
```

## 📦 Production Deployment

### Docker (Recommended)
```bash
# Clone repository
git clone <repo-url>
cd voice-ussd-research-system

# Configure environment
cp .env.example .env
# Edit .env with production values

# Deploy with Docker
docker-compose up -d

# Check status
docker-compose ps
```

### Manual Deployment
```bash
# Install dependencies
npm ci --production

# Run migrations
npm run db:migrate

# Start with PM2
npm run deploy
```

## 🎯 Key Performance Metrics

- **USSD Response Time:** < 2 seconds
- **Voice Call Setup:** < 10 seconds  
- **AI Processing:** < 30 seconds per recording
- **Concurrent Users:** 1000+ USSD sessions
- **Uptime:** 99.9% availability target
- **Data Accuracy:** 95%+ transcription confidence

## 🌍 Multilingual Support

- **English** - Full interface and voice prompts
- **Swahili** - Complete translation for East Africa
- **Extensible** - Easy to add more languages
- **Dynamic switching** - Users can change language mid-session

## 🔧 Monitoring & Maintenance

- **Health checks** at `/health` endpoint
- **Structured logging** with Winston
- **Error tracking** and alerting
- **Performance monitoring** with built-in metrics
- **Automated backups** and recovery procedures

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation:** Check the `/docs` folder
- **Issues:** Create GitHub issues for bugs
- **Email:** support@research-system.com
- **Phone:** +254700000000 (Kenya)

---

**Built for researchers in Africa** 🌍 **Powered by AI** 🤖 **Production Ready** 🚀#   r e s e a r c h - a s s i s t e n c e - b a c k  
 