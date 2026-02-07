# Project Structure

## AI-Powered Research Data Collection System

### Root Directory
```
research-system/
├── src/                    # Source code
├── docs/                   # Documentation
├── .dockerignore          # Docker ignore rules
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── cloudbuild.yaml        # Google Cloud Build configuration
├── deploy.ps1             # Windows deployment script
├── deploy.sh              # Linux/Mac deployment script
├── Dockerfile             # Docker container configuration
├── LICENSE                # MIT License
├── package.json           # Node.js dependencies
├── package-lock.json      # Locked dependencies
├── README.md              # Main documentation
├── QUICK_START.md         # Quick start guide
├── HACKATHON_SUBMISSION.md # Hackathon submission details
├── FINAL_STATUS.md        # Current system status
└── SMS_TESTING_GUIDE.md   # SMS testing documentation
```

### Source Code (`src/`)
```
src/
├── controllers/           # Request handlers
│   ├── apiController.js
│   ├── authController.js
│   ├── dashboardController.js
│   ├── smsController.js
│   ├── ussdController.js
│   └── voiceController.js
├── database/              # Database layer
│   ├── connection.js
│   ├── migrate.js
│   ├── schema.sql
│   └── seed.js
├── middleware/            # Express middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── rateLimiter.js
├── routes/                # API routes
│   ├── api.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── sms.js
│   ├── ussd.js
│   └── voice.js
├── services/              # Business logic
│   ├── aiService.js       # Google Gemini AI integration
│   ├── smsService.js      # Africa's Talking SMS
│   ├── ussdService.js     # USSD menu logic
│   └── voiceService.js    # Voice call handling
├── utils/                 # Utilities
│   └── logger.js
├── views/                 # EJS templates
│   ├── dashboard/
│   └── layout.ejs
├── workers/               # Background jobs
│   └── aiWorker.js
└── server.js              # Application entry point
```

### Documentation (`docs/`)
```
docs/
├── API.md                 # API documentation
├── DEPLOYMENT.md          # Deployment guide
├── DEPLOYMENT_SUCCESS.md  # Deployment checklist
├── EVALUATION.md          # AI evaluation metrics
├── GOOGLE_CLOUD_RUN.md    # Cloud Run setup
├── SECURITY.md            # Security implementation
└── TESTING.md             # Testing guide
```

## Key Features

### 1. USSD Interface
- Multi-language support (English/Kiswahili)
- Interactive menu system
- Question answering flow
- Session management

### 2. SMS Integration
- Automatic thank you messages
- Delivery tracking
- Multi-language support
- Cost-effective messaging

### 3. AI Processing (Gemini 2.5 Flash)
- Text analysis and summarization
- Sentiment analysis
- Theme extraction
- Voice transcription (ready)

### 4. Database
- PostgreSQL on Cloud SQL
- Secure connection via Unix socket
- Automatic migrations
- Sample data seeding

### 5. Security
- JWT authentication
- Rate limiting
- Input validation
- Secret management via Google Secret Manager

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Cloud SQL)
- **AI**: Google Gemini 2.5 Flash
- **SMS/USSD**: Africa's Talking API
- **Hosting**: Google Cloud Run
- **Authentication**: JWT
- **Logging**: Winston

## Environment Variables

See `.env.example` for required configuration.

## Deployment

- **Production**: Google Cloud Run
- **Region**: us-central1
- **URL**: https://research-system-864580156744.us-central1.run.app

## Documentation

- **README.md** - Overview and setup
- **QUICK_START.md** - Quick deployment guide
- **HACKATHON_SUBMISSION.md** - Hackathon details
- **FINAL_STATUS.md** - Current system status
- **SMS_TESTING_GUIDE.md** - SMS testing instructions
- **docs/** - Detailed technical documentation

## License

MIT License - See LICENSE file for details
