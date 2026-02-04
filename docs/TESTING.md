# Testing Guide

## Test USSD Flow

### 1. Basic USSD Testing

**Test the main menu:**
```
Dial: *123*345#
Expected Response: 
CON Research Information System
1. Research Information
2. Answer Research Questions
3. Record Voice Response
4. Listen to Research Summary
5. Change Language / Badili Lugha
0. Exit
```

**Test menu navigation:**
```
Input: 1
Expected Response:
CON Research Information
1. About This Research
2. How to Participate
3. Privacy & Data Use
4. Contact Information
0. Back to Main Menu
```

**Test question answering:**
```
Input: 2 (from main menu)
Expected Response:
CON Select a question to answer:
1. How do you rate healthcare services?
2. What are your main challenges?
0. Back to Main Menu
```

### 2. Language Testing

**Switch to Swahili:**
```
Input: 5 (from main menu)
Expected Response:
CON Select Language / Chagua Lugha
1. English
2. Kiswahili
0. Back / Rudi

Input: 2
Expected Response:
CON Mfumo wa Taarifa za Utafiti
1. Taarifa za Utafiti
2. Jibu Maswali ya Utafiti
3. Rekodi Jibu la Sauti
4. Sikiliza Muhtasari wa Utafiti
5. Badili Lugha
0. Toka
```

## Test Voice Flow

### 1. Outbound Call Testing

**Trigger voice call via USSD:**
```
Input: 3 (from main menu)
Expected Response:
END You will receive a call shortly for voice recording.
```

**Expected call flow:**
1. User receives call
2. Hears welcome message
3. Prompted to press digits for menu
4. Can record voice responses
5. Call ends with thank you message

### 2. Voice Response Testing

**Test voice menu navigation:**
- Press 1: Answer research questions
- Press 2: Listen to information
- Press 0: End call

**Test voice recording:**
- System plays question
- User speaks response (up to 2 minutes)
- System confirms recording saved

## API Testing

### 1. Authentication Testing

```bash
# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Expected response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

### 2. API Endpoints Testing

```bash
# Get health status
curl http://localhost:3000/api/health

# Get questions (requires auth)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/questions

# Get responses
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/responses?page=1&limit=10"

# Get analytics
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/analytics
```

### 3. USSD Callback Testing

```bash
# Simulate Africa's Talking USSD callback
curl -X POST http://localhost:3000/ussd/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=test123&serviceCode=*123*345#&phoneNumber=%2B254700000000&text="

# Test menu navigation
curl -X POST http://localhost:3000/ussd/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=test123&serviceCode=*123*345#&phoneNumber=%2B254700000000&text=1"
```

### 4. Voice Callback Testing

```bash
# Simulate voice callback
curl -X POST http://localhost:3000/voice/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=voice123&phoneNumber=%2B254700000000&isActive=1"

# Simulate recording callback
curl -X POST http://localhost:3000/voice/recording \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=voice123&recordingUrl=https://example.com/recording.wav&durationInSeconds=30"
```

## Load Testing

### 1. USSD Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Create artillery config (ussd-load-test.yml)
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "USSD Flow"
    requests:
      - post:
          url: "/ussd/callback"
          form:
            sessionId: "load_{{ $randomString() }}"
            serviceCode: "*123*345#"
            phoneNumber: "+254700000000"
            text: ""

# Run load test
artillery run ussd-load-test.yml
```

### 2. API Load Testing

```bash
# API load test config (api-load-test.yml)
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: "API Endpoints"
    requests:
      - get:
          url: "/api/health"
      - post:
          url: "/auth/login"
          json:
            username: "admin"
            password: "admin123"

# Run API load test
artillery run api-load-test.yml
```

## Database Testing

### 1. Test Data Setup

```sql
-- Insert test questions
INSERT INTO research_questions (title, question_text, category, language) VALUES
('Test Question 1', 'How do you rate our service?', 'feedback', 'en'),
('Test Question 2', 'What improvements would you suggest?', 'feedback', 'en'),
('Swali la Mtihani', 'Unaonaje huduma zetu?', 'maoni', 'sw');

-- Insert test responses
INSERT INTO research_responses (phone_number, question_id, response_type, response_text, language)
SELECT '+254700000001', id, 'ussd', 'Very good service', 'en'
FROM research_questions WHERE title = 'Test Question 1';
```

### 2. Performance Testing

```sql
-- Test query performance
EXPLAIN ANALYZE SELECT * FROM research_responses 
WHERE created_at > NOW() - INTERVAL '7 days';

-- Test with large dataset
INSERT INTO research_responses (phone_number, response_type, response_text, language)
SELECT 
  '+25470000' || LPAD((random() * 9999)::text, 4, '0'),
  'ussd',
  'Test response ' || generate_series,
  'en'
FROM generate_series(1, 10000);
```

## AI Processing Testing

### 1. Test Audio Processing

```bash
# Test with sample audio file
curl -X POST http://localhost:3000/voice/recording \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=ai_test&recordingUrl=https://example.com/sample.wav&durationInSeconds=30"

# Trigger AI processing
curl -X POST http://localhost:3000/api/ai/process \
  -H "Authorization: Bearer <token>" \
  -d "limit=1"
```

### 2. Mock AI Services

```javascript
// For testing without OpenAI API
// Add to aiService.js for testing
if (process.env.NODE_ENV === 'test') {
  this.transcribeAudio = async () => ({
    text: 'Mock transcription text',
    confidence: 0.95,
    language: 'en'
  });
  
  this.generateSummary = async () => ({
    text: 'Mock summary text',
    keyPoints: ['Point 1', 'Point 2'],
    sentiment: 'positive'
  });
}
```

## Integration Testing

### 1. End-to-End USSD Flow

```javascript
// Test complete USSD session
const request = require('supertest');
const app = require('../src/server');

describe('USSD Integration', () => {
  test('Complete USSD session flow', async () => {
    const sessionId = 'test_' + Date.now();
    
    // Start session
    const response1 = await request(app)
      .post('/ussd/callback')
      .send({
        sessionId,
        serviceCode: '*123*345#',
        phoneNumber: '+254700000000',
        text: ''
      });
    
    expect(response1.text).toContain('CON Research Information System');
    
    // Navigate to questions
    const response2 = await request(app)
      .post('/ussd/callback')
      .send({
        sessionId,
        serviceCode: '*123*345#',
        phoneNumber: '+254700000000',
        text: '2'
      });
    
    expect(response2.text).toContain('CON Select a question');
  });
});
```

### 2. Voice Integration Testing

```javascript
describe('Voice Integration', () => {
  test('Voice call flow', async () => {
    const sessionId = 'voice_test_' + Date.now();
    
    // Simulate voice callback
    const response = await request(app)
      .post('/voice/callback')
      .send({
        sessionId,
        phoneNumber: '+254700000000',
        isActive: '1'
      });
    
    expect(response.text).toContain('<?xml version="1.0"');
    expect(response.text).toContain('<Say>');
  });
});
```

## Monitoring and Alerts Testing

### 1. Health Check Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00Z",
  "version": "1.0.0"
}
```

### 2. Error Handling Testing

```bash
# Test invalid USSD input
curl -X POST http://localhost:3000/ussd/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=error_test&serviceCode=invalid&phoneNumber=invalid"

# Test rate limiting
for i in {1..20}; do
  curl http://localhost:3000/api/health &
done
```

## Security Testing

### 1. Authentication Testing

```bash
# Test without token
curl http://localhost:3000/api/questions
# Expected: 401 Unauthorized

# Test with invalid token
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:3000/api/questions
# Expected: 401 Unauthorized
```

### 2. Input Validation Testing

```bash
# Test SQL injection
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\'' OR 1=1--","password":"test"}'

# Test XSS
curl -X POST http://localhost:3000/api/questions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"<script>alert(1)</script>","question_text":"test"}'
```

## Automated Testing

### 1. Unit Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### 2. Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific test suite
npm test -- --grep "USSD"
```

### 3. Continuous Testing

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```