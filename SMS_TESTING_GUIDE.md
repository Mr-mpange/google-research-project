# SMS Testing Guide

## Current Status

### ✅ What's Implemented
- SMS service fully coded in `src/services/smsService.js`
- SMS triggered automatically after USSD response submission
- Phone number formatting (handles +254, 0, etc.)
- Thank you message with question details
- Bilingual support (English/Kiswahili)
- Detailed logging for debugging

### ⚠️ Current Issue
**Error**: `Request failed with status code 401`  
**Cause**: API key authentication failing with Africa's Talking

## How SMS Works in the System

### Flow
1. User completes USSD question (e.g., `2*1*My answer`)
2. Response saved to database
3. `handleQuestionAnswer()` calls `sendThankYouSMS()` asynchronously
4. SMS service formats phone number and builds message
5. Africa's Talking API called to send SMS
6. Success/failure logged

### Code Location
- **Service**: `src/services/smsService.js`
- **Trigger**: `src/services/ussdService.js` line ~353
- **Controller**: `src/controllers/smsController.js` (for manual testing)

## Fixing the 401 Error

### Option 1: Verify API Key in Dashboard
1. Login to Africa's Talking: https://account.africastalking.com/
2. Go to Settings → API Key
3. Copy the correct API key for your sandbox account
4. Update the secret:
```powershell
$apiKey = "YOUR_CORRECT_API_KEY_HERE"
$apiKey | Out-File -FilePath temp_key.txt -NoNewline -Encoding ASCII
gcloud secrets versions add at-api-key --data-file=temp_key.txt --project=trans-campus-480505-i2
Remove-Item temp_key.txt

# Update Cloud Run
gcloud run services update research-system --region us-central1 --update-secrets=AT_API_KEY=at-api-key:latest --quiet
```

### Option 2: Check Username Matches
The username must match the API key account:
```powershell
# Check current username
gcloud secrets versions access latest --secret="at-username" --project=trans-campus-480505-i2

# If needed, update username
echo "YOUR_USERNAME" | gcloud secrets versions add at-username --data-file=- --project=trans-campus-480505-i2
gcloud run services update research-system --region us-central1 --update-secrets=AT_USERNAME=at-username:latest --quiet
```

### Option 3: Use Production Account
If you have a production account (not sandbox):
1. Get production API key and username
2. Update both secrets as shown above
3. Remove "sandbox" references

## Testing SMS Manually

### Via API Endpoint (Requires Auth)
```bash
# First, login to get token
curl -X POST https://research-system-864580156744.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Then send test SMS
curl -X POST https://research-system-864580156744.us-central1.run.app/sms/thank-you \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+254683859574",
    "language": "en",
    "questionTitle": "Test Question"
  }'
```

### Via USSD Flow (No Auth Required)
Complete the full USSD flow as tested:
```powershell
# Step 1: Main menu
Invoke-WebRequest -Uri "https://research-system-864580156744.us-central1.run.app/ussd/callback" -Method POST -ContentType "application/x-www-form-urlencoded" -Body "sessionId=test123&serviceCode=*384*34153#&phoneNumber=%2B254683859574&text="

# Step 2: Select questions
Invoke-WebRequest -Uri "https://research-system-864580156744.us-central1.run.app/ussd/callback" -Method POST -ContentType "application/x-www-form-urlencoded" -Body "sessionId=test123&serviceCode=*384*34153#&phoneNumber=%2B254683859574&text=2"

# Step 3: Select a question
Invoke-WebRequest -Uri "https://research-system-864580156744.us-central1.run.app/ussd/callback" -Method POST -ContentType "application/x-www-form-urlencoded" -Body "sessionId=test123&serviceCode=*384*34153#&phoneNumber=%2B254683859574&text=2*1"

# Step 4: Submit answer (triggers SMS)
Invoke-WebRequest -Uri "https://research-system-864580156744.us-central1.run.app/ussd/callback" -Method POST -ContentType "application/x-www-form-urlencoded" -Body "sessionId=test123&serviceCode=*384*34153#&phoneNumber=%2B254683859574&text=2*1*My+test+answer"
```

## Checking SMS Logs

### View Recent Logs
```powershell
# All SMS-related logs
gcloud run services logs read research-system --region us-central1 --limit 50 | Select-String -Pattern "SMS|sms" -Context 2

# Just errors
gcloud run services logs read research-system --region us-central1 --limit 50 | Select-String -Pattern "Failed to send"
```

### What to Look For
✅ **Success indicators**:
- `Preparing to send thank you SMS`
- `Sending thank you SMS`
- `Thank you SMS sent successfully`
- Message ID and cost in logs

❌ **Error indicators**:
- `Failed to send thank you SMS`
- `401` = Authentication error (wrong API key/username)
- `403` = Permission denied
- `Invalid character in header` = API key has newline/special chars

## SMS Message Format

### English
```
Thank you for completing our research survey! 

✅ Your response to "Economic Opportunities" has been recorded.

Your insights help us understand community needs and improve services. We truly appreciate the time you took to share your thoughts.

🙏 Thank you for making a difference!

Research Team
Community Research
Info: Dial *384*34153# anytime to participate again.
```

### Kiswahili
```
Asante kwa kukamilisha utafiti wetu!

✅ Jibu lako kwa "Fursa za Kiuchumi" limerekodiwa.

Maoni yako yanasaidia kuelewa mahitaji ya jamii na kuboresha huduma. Tunashukuru muda uliochukua kushiriki mawazo yako.

🙏 Asante kwa kuleta mabadiliko!

Timu ya Utafiti
Utafiti wa Jamii
Taarifa: Piga *384*34153# wakati wowote kushiriki tena.
```

## Troubleshooting

### Issue: 401 Authentication Error
**Solution**: API key doesn't match username
- Verify both are from same AT account
- Check for typos or extra characters
- Ensure no newlines in secret

### Issue: SMS Not Triggered
**Solution**: Check USSD flow completes
- Verify response saved to database
- Check logs for "response_saved" message
- Ensure async SMS call isn't blocked

### Issue: Invalid Phone Number
**Solution**: Phone formatting
- System handles: +254683859574, 0683859574, 683859574
- All converted to +254 format
- Check logs for "cleanPhone" value

### Issue: SMS Sent But Not Received
**Solution**: Check AT dashboard
- Login to Africa's Talking
- Go to SMS → Outbox
- Check delivery status
- Verify phone number is correct

## Next Steps

1. **Fix Authentication**
   - Get correct API key from AT dashboard
   - Update secret in Google Cloud
   - Test SMS sending

2. **Configure Webhooks** (Optional)
   - Delivery reports: `https://research-system-864580156744.us-central1.run.app/sms/delivery-report`
   - Track SMS delivery status

3. **Test in Production**
   - Move from sandbox to production account
   - Update API key and username
   - Test with real phone numbers

4. **Monitor Costs**
   - Check SMS costs in AT dashboard
   - Set up billing alerts
   - Monitor usage patterns

## Africa's Talking Dashboard Links

- **Login**: https://account.africastalking.com/
- **API Settings**: https://account.africastalking.com/apps/sandbox/settings/key
- **SMS Outbox**: https://account.africastalking.com/apps/sandbox/sms/outbox
- **Billing**: https://account.africastalking.com/billing

## Support

If SMS still doesn't work after fixing authentication:
1. Check Africa's Talking status page
2. Verify account has SMS credits
3. Test with AT's SMS simulator
4. Contact AT support with error logs
