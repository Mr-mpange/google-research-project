# API Documentation

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

## Research Questions

### Get Questions
```http
GET /api/questions?language=en&category=health&active=true
Authorization: Bearer <token>
```

### Create Question
```http
POST /api/questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Community Health Survey",
  "description": "Survey about healthcare access",
  "question_text": "How would you rate healthcare services in your area?",
  "category": "health",
  "language": "en"
}
```

### Update Question
```http
PUT /api/questions/{questionId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "is_active": false
}
```

### Delete Question
```http
DELETE /api/questions/{questionId}
Authorization: Bearer <token>
```

## Research Responses

### Get Responses
```http
GET /api/responses?page=1&limit=50&type=voice&includeAI=true
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "responses": [
    {
      "id": "uuid",
      "phone_number": "+254700000000",
      "response_type": "voice",
      "response_text": "Healthcare is good in our area",
      "audio_file_path": "/uploads/audio/recording.wav",
      "transcribed_text": "Healthcare is good in our area...",
      "summary_text": "Positive feedback about healthcare services",
      "sentiment": "positive",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### Get Single Response
```http
GET /api/responses/{responseId}
Authorization: Bearer <token>
```

## Analytics

### Get Analytics Summary
```http
GET /api/analytics?startDate=2024-01-01&endDate=2024-01-31&granularity=day
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "analytics": {
    "responseStats": {
      "total_responses": 1250,
      "ussd_responses": 800,
      "voice_responses": 450,
      "unique_participants": 650,
      "questions_answered": 15
    },
    "aiStats": {
      "total_transcriptions": 450,
      "avg_transcription_confidence": 0.92,
      "total_summaries": 450,
      "avg_summary_confidence": 0.88,
      "positive_responses": 280,
      "negative_responses": 85,
      "neutral_responses": 85
    },
    "trends": [
      {
        "period": "2024-01-01T00:00:00Z",
        "responses": 45,
        "ussd_responses": 30,
        "voice_responses": 15
      }
    ],
    "topQuestions": [
      {
        "id": "uuid",
        "title": "Healthcare Access",
        "response_count": 125
      }
    ]
  }
}
```

## AI Processing

### Trigger AI Processing
```http
POST /api/ai/process?limit=10
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "message": "Processed 5 recordings",
  "processedCount": 5
}
```

## USSD Callbacks (Africa's Talking)

### USSD Callback
```http
POST /ussd/callback
Content-Type: application/x-www-form-urlencoded

sessionId=session123&serviceCode=*123*345#&phoneNumber=%2B254700000000&text=1*2
```

Response:
```
CON Welcome to Research System
1. Research Information
2. Answer Questions
3. Record Voice Response
0. Exit
```

## Voice Callbacks (Africa's Talking)

### Voice Callback
```http
POST /voice/callback
Content-Type: application/x-www-form-urlencoded

sessionId=call123&phoneNumber=%2B254700000000&isActive=1
```

Response:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">Welcome to the Research System</Say>
  <GetDigits timeout="10" finishOnKey="#">
    <Say>Press 1 for questions, 2 for information</Say>
  </GetDigits>
</Response>
```

### Recording Callback
```http
POST /voice/recording
Content-Type: application/x-www-form-urlencoded

sessionId=call123&recordingUrl=https://voice.africastalking.com/recording.wav&durationInSeconds=45
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message",
  "details": ["Validation error details"]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limits

- API endpoints: 10 requests/second
- USSD callbacks: 50 requests/second
- Voice callbacks: 20 requests/second

## Webhooks

### USSD Session Events
```json
{
  "event": "ussd_session_started",
  "sessionId": "session123",
  "phoneNumber": "+254700000000",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### Voice Call Events
```json
{
  "event": "voice_call_completed",
  "callId": "call123",
  "phoneNumber": "+254700000000",
  "duration": 45,
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### AI Processing Events
```json
{
  "event": "transcription_completed",
  "responseId": "uuid",
  "confidence": 0.92,
  "timestamp": "2024-01-01T10:00:00Z"
}
```