# 📱 SMS Thank You Feature

## Overview
The system now automatically sends a thank you SMS to users after they complete a research response via USSD. The SMS is sent to the **same phone number** that initiated the USSD session.

## How It Works

### 1. **USSD Flow with SMS**
```
User dials *384*34153# from +254712345678
↓
Selects research question
↓
Provides answer
↓
Response saved to database
↓
✅ Thank you SMS sent to +254712345678
```

### 2. **Phone Number Handling**
- The system automatically extracts the phone number from the USSD session
- Phone numbers are cleaned and formatted (removes URL encoding, spaces, etc.)
- Supports multiple formats:
  - `+254712345678` (international)
  - `0712345678` (local - converted to +254712345678)
  - `254712345678` (without +)
  - URL encoded: `%2B254712345678`

### 3. **SMS Content**

**English Message:**
```
Thank you for completing our research survey! 

✅ Your response to "Economic Opportunities" has been recorded.

Your insights help us understand community needs and improve services. We truly appreciate the time you took to share your thoughts.

🙏 Thank you for making a difference!

Research Team
Community Research Initiative
Info: Dial *384*34153# anytime to participate again.
```

**Swahili Message:**
```
Asante kwa kukamilisha utafiti wetu!

✅ Jibu lako kwa "Fursa za Kiuchumi" limerekodiwa.

Maoni yako yanasaidia kuelewa mahitaji ya jamii na kuboresha huduma. Tunashukuru muda uliochukua kushiriki mawazo yako.

🙏 Asante kwa kuleta mabadiliko!

Timu ya Utafiti
Utafiti wa Jamii
Taarifa: Piga *384*34153# wakati wowote kushiriki tena.
```

## Configuration

### Environment Variables
```env
# Africa's Talking Configuration
AT_USERNAME=sandbox
AT_API_KEY=your_api_key
AT_SHORTCODE=your_shortcode  # Optional, for branded SMS

# Organization Details (used in SMS)
ORGANIZATION_NAME=Community Research Initiative
CONTACT_PHONE=+254700000000
CONTACT_EMAIL=research@community.org

# USSD Code (included in SMS)
USSD_CODE=*384*34153#
```

## Features

### ✅ Automatic SMS Sending
- SMS sent automatically after research response completion
- Non-blocking (doesn't delay USSD response)
- Error handling (failures logged but don't affect user experience)

### ✅ Multilingual Support
- English and Swahili messages
- Language matches the USSD session language
- Easy to add more languages

### ✅ Phone Number Validation
- Automatic formatting and cleaning
- Supports multiple phone number formats
- URL decoding for encoded numbers

### ✅ Detailed Logging
- All SMS attempts logged
- Success/failure tracking
- Phone number and message details recorded

## API Endpoints

### 1. **Send Thank You SMS** (Admin/Researcher)
```http
POST /sms/thank-you
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "phoneNumber": "+254712345678",
  "language": "en",
  "questionTitle": "Economic Opportunities"
}
```

### 2. **Send Research Invitation** (Admin/Researcher)
```http
POST /sms/invite
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "phoneNumbers": ["+254712345678", "+254723456789"],
  "language": "en"
}
```

### 3. **Send Bulk SMS** (Admin Only)
```http
POST /sms/bulk
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "message": "Custom message to all participants",
  "language": "en",
  "targetGroup": "all"  // Options: all, recent, language
}
```

### 4. **SMS Statistics**
```http
GET /sms/statistics?startDate=2026-02-01&endDate=2026-02-28
Authorization: Bearer YOUR_JWT_TOKEN
```

### 5. **SMS Delivery Reports** (Webhook)
```http
POST /sms/delivery-report
Content-Type: application/json

{
  "id": "message_id",
  "status": "Success",
  "phoneNumber": "+254712345678",
  "failureReason": null
}
```

## Testing

### Step 1: Get Authentication Token
```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "username": "admin",
    "role": "admin"
  }
}
```

### Step 2: Test with USSD Simulator
1. Dial `*384*34153#` with your phone number
2. Complete a research question
3. Check your phone for the thank you SMS

### Step 3: Test with Postman (Complete USSD Flow)
```http
POST http://localhost:3000/ussd/callback
Content-Type: application/x-www-form-urlencoded

sessionId=test123
serviceCode=*384*34153#
phoneNumber=+254712345678
text=Your answer here
```

### Step 4: Test SMS Manually (Admin)
```http
POST http://localhost:3000/sms/thank-you
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "phoneNumber": "+254712345678",
  "language": "en",
  "questionTitle": "Test Question"
}
```

### Step 5: Test Research Invitation
```http
POST http://localhost:3000/sms/invite
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "phoneNumbers": ["+254712345678"],
  "language": "en"
}
```

## SMS Service Features

### 1. **Thank You SMS**
- Sent after completing research response
- Includes question title
- Personalized message
- Organization branding

### 2. **Research Invitation SMS**
- Invite participants to join research
- Includes USSD code
- Multilingual support

### 3. **Bulk SMS**
- Send messages to all participants
- Target specific groups (recent, by language)
- Admin-only feature

### 4. **Delivery Reports**
- Webhook endpoint for delivery status
- Track SMS success/failure
- Cost tracking

## Error Handling

### SMS Failures
- Logged but don't block USSD flow
- User still sees success message
- Admin can review logs for failed SMS

### Invalid Phone Numbers
- Automatic formatting attempts
- Validation before sending
- Clear error messages in logs

### API Errors
- Graceful degradation
- Retry logic (optional)
- Detailed error logging

## Cost Considerations

### Africa's Talking Pricing
- SMS costs vary by country
- Sandbox mode: Free (limited)
- Production: ~$0.01-0.05 per SMS
- Bulk discounts available

### Optimization
- SMS sent asynchronously (non-blocking)
- Only sent on successful response
- Optional: Batch SMS for cost savings

## Monitoring

### Logs to Check
```bash
# View SMS logs
tail -f logs/combined.log | grep "SMS"

# Check for failures
tail -f logs/error.log | grep "SMS"

# Monitor in real-time
npm run dev
```

### Key Metrics
- SMS sent count
- Success rate
- Failed deliveries
- Cost per SMS
- Response time

## Troubleshooting

### SMS Not Sending
1. Check Africa's Talking credentials
2. Verify phone number format
3. Check API balance
4. Review error logs

### Wrong Phone Number
1. Verify USSD session phone number
2. Check URL encoding
3. Review phone number formatting logic

### Message Not Received
1. Check delivery reports
2. Verify phone number is active
3. Check spam/blocked messages
4. Verify Africa's Talking account status

## Future Enhancements

- [ ] SMS templates management
- [ ] Scheduled SMS campaigns
- [ ] SMS analytics dashboard
- [ ] A/B testing for messages
- [ ] SMS opt-out management
- [ ] Rich media SMS (MMS)
- [ ] Two-way SMS conversations

## Support

For issues or questions:
- Check logs: `logs/combined.log`
- Review Africa's Talking dashboard
- Contact: research@community.org

---

**Built with ❤️ for African Researchers**