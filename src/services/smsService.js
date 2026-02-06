const AfricasTalking = require('africastalking');
const logger = require('../utils/logger');

class SMSService {
  constructor() {
    // Log initialization (mask sensitive data)
    logger.info('Initializing Africa\'s Talking SMS Service', {
      username: process.env.AT_USERNAME,
      apiKeyLength: process.env.AT_API_KEY?.length,
      apiKeyPrefix: process.env.AT_API_KEY?.substring(0, 10) + '...'
    });

    this.client = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME
    });
    
    this.sms = this.client.SMS;
    
    logger.info('Africa\'s Talking SMS Service initialized successfully');
  }

  // Test connection to Africa's Talking
  async testConnection() {
    try {
      logger.info('Testing Africa\'s Talking connection');
      
      // Try to send to a test number (won't actually send in sandbox)
      const result = await this.sms.send({
        to: ['+255000000000'],
        message: 'Test connection'
      });
      
      logger.info('Connection test result', { result });
      return { success: true, result };
    } catch (error) {
      logger.error('Connection test failed', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return { success: false, error: error.message };
    }
  }

  // Send thank you SMS after research completion
  async sendThankYouSMS(phoneNumber, language = 'en', responseDetails = {}) {
    try {
      // Clean and format phone number
      const cleanPhoneNumber = this.formatPhoneNumber(phoneNumber);
      const message = this.buildThankYouMessage(language, responseDetails);
      
      logger.info('Sending thank you SMS', {
        originalPhone: phoneNumber,
        cleanPhone: cleanPhoneNumber,
        language,
        messageLength: message.length,
        questionTitle: responseDetails.questionTitle,
        username: process.env.AT_USERNAME,
        apiKeyPresent: !!process.env.AT_API_KEY,
        apiKeyLength: process.env.AT_API_KEY?.length
      });

      const sendOptions = {
        to: cleanPhoneNumber,
        message: message
      };
      
      // Only add 'from' if shortcode is available
      if (process.env.AT_SHORTCODE) {
        sendOptions.from = process.env.AT_SHORTCODE;
      }

      logger.info('SMS send options', { 
        to: sendOptions.to, 
        messageLength: sendOptions.message.length,
        hasFrom: !!sendOptions.from 
      });

      const result = await this.sms.send(sendOptions);

      logger.info('SMS API response received', { 
        result: JSON.stringify(result),
        recipients: result.SMSMessageData?.Recipients 
      });

      const recipient = result.SMSMessageData?.Recipients?.[0];
      
      if (recipient) {
        logger.info('Thank you SMS sent successfully', {
          phoneNumber: cleanPhoneNumber,
          messageId: recipient.messageId,
          status: recipient.status,
          statusCode: recipient.statusCode,
          cost: recipient.cost
        });

        return {
          success: true,
          messageId: recipient.messageId,
          status: recipient.status,
          statusCode: recipient.statusCode,
          cost: recipient.cost,
          phoneNumber: cleanPhoneNumber
        };
      } else {
        throw new Error('No recipient data in SMS response');
      }

    } catch (error) {
      logger.error('Failed to send thank you SMS', {
        phoneNumber,
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers
      });

      return {
        success: false,
        error: error.message,
        phoneNumber,
        details: error.response?.data
      };
    }
  }

  // Format phone number for Africa's Talking
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove URL encoding
    let cleaned = decodeURIComponent(phoneNumber);
    
    // Remove any spaces, dashes, or other formatting
    cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
    
    // Ensure it starts with + for international format
    if (!cleaned.startsWith('+')) {
      // If it starts with 0, replace with country code (assuming Tanzania +255)
      if (cleaned.startsWith('0')) {
        cleaned = '+255' + cleaned.substring(1);
      } 
      // If it starts with 255, add +
      else if (cleaned.startsWith('255')) {
        cleaned = '+' + cleaned;
      }
      // If it starts with 254 (Kenya), add +
      else if (cleaned.startsWith('254')) {
        cleaned = '+' + cleaned;
      }
      // If it's just digits and looks like a Tanzanian number (6-7 digits), add +255
      else if (/^[67]\d{8}$/.test(cleaned)) {
        cleaned = '+255' + cleaned;
      }
      // Otherwise, assume it needs +255
      else if (!/^\+/.test(cleaned)) {
        cleaned = '+255' + cleaned;
      }
    }
    
    return cleaned;
  }

  // Send research invitation SMS
  async sendResearchInvitation(phoneNumber, language = 'en') {
    try {
      const message = this.buildInvitationMessage(language);
      
      logger.info('Sending research invitation SMS', {
        phoneNumber,
        language
      });

      const sendOptions = {
        to: phoneNumber,
        message: message
      };
      
      // Only add 'from' if shortcode is available
      if (process.env.AT_SHORTCODE) {
        sendOptions.from = process.env.AT_SHORTCODE;
      }

      const result = await this.sms.send(sendOptions);

      logger.info('Research invitation SMS sent', {
        phoneNumber,
        messageId: result.SMSMessageData?.Recipients?.[0]?.messageId,
        status: result.SMSMessageData?.Recipients?.[0]?.status
      });

      return {
        success: true,
        messageId: result.SMSMessageData?.Recipients?.[0]?.messageId,
        status: result.SMSMessageData?.Recipients?.[0]?.status
      };

    } catch (error) {
      logger.error('Failed to send invitation SMS', {
        phoneNumber,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Build thank you message based on language
  buildThankYouMessage(language = 'en', responseDetails = {}) {
    const messages = {
      en: {
        basic: `Thank you for participating in our research! Your response has been recorded and will help improve services in your community. 

Your participation makes a difference! 

Research Team
${process.env.ORGANIZATION_NAME || 'Community Research'}`,
        
        detailed: `Thank you for completing our research survey! 

✅ Your response to "${responseDetails.questionTitle || 'our question'}" has been recorded.

Your insights help us understand community needs and improve services. We truly appreciate the time you took to share your thoughts.

🙏 Thank you for making a difference!

Research Team
${process.env.ORGANIZATION_NAME || 'Community Research'}
Info: Dial ${process.env.USSD_CODE || '*384*34153#'} anytime to participate again.`
      },
      
      sw: {
        basic: `Asante kwa kushiriki katika utafiti wetu! Jibu lako limerekodiwa na litasaidia kuboresha huduma katika jamii yako.

Ushiriki wako unamaana!

Timu ya Utafiti
${process.env.ORGANIZATION_NAME || 'Utafiti wa Jamii'}`,
        
        detailed: `Asante kwa kukamilisha utafiti wetu!

✅ Jibu lako kwa "${responseDetails.questionTitle || 'swali letu'}" limerekodiwa.

Maoni yako yanasaidia kuelewa mahitaji ya jamii na kuboresha huduma. Tunashukuru muda uliochukua kushiriki mawazo yako.

🙏 Asante kwa kuleta mabadiliko!

Timu ya Utafiti
${process.env.ORGANIZATION_NAME || 'Utafiti wa Jamii'}
Taarifa: Piga ${process.env.USSD_CODE || '*384*34153#'} wakati wowote kushiriki tena.`
      }
    };

    const langMessages = messages[language] || messages.en;
    
    // Use detailed message if we have response details, otherwise basic
    return responseDetails.questionTitle ? langMessages.detailed : langMessages.basic;
  }

  // Build research invitation message
  buildInvitationMessage(language = 'en') {
    const messages = {
      en: `🔬 You're invited to participate in our community research!

Your voice matters! Help us understand community needs by sharing your thoughts.

📱 Dial: ${process.env.USSD_CODE || '*384*34153#'}
⏰ Takes only 2-3 minutes
🎁 Your participation helps improve local services

Thank you for making a difference!

Research Team
${process.env.ORGANIZATION_NAME || 'Community Research'}`,

      sw: `🔬 Umealikwa kushiriki katika utafiti wa jamii!

Sauti yako ina maana! Tusaidie kuelewa mahitaji ya jamii kwa kushiriki mawazo yako.

📱 Piga: ${process.env.USSD_CODE || '*384*34153#'}
⏰ Inachukua dakika 2-3 tu
🎁 Ushiriki wako unasaidia kuboresha huduma za mitaani

Asante kwa kuleta mabadiliko!

Timu ya Utafiti
${process.env.ORGANIZATION_NAME || 'Utafiti wa Jamii'}`
    };

    return messages[language] || messages.en;
  }

  // Send bulk SMS to multiple recipients
  async sendBulkSMS(phoneNumbers, message, language = 'en') {
    try {
      logger.info('Sending bulk SMS', {
        recipientCount: phoneNumbers.length,
        language,
        messageLength: message.length
      });

      const sendOptions = {
        to: phoneNumbers,
        message: message
      };
      
      // Only add 'from' if shortcode is available
      if (process.env.AT_SHORTCODE) {
        sendOptions.from = process.env.AT_SHORTCODE;
      }

      const result = await this.sms.send(sendOptions);

      const recipients = result.SMSMessageData?.Recipients || [];
      const successful = recipients.filter(r => r.status === 'Success').length;
      const failed = recipients.filter(r => r.status !== 'Success').length;

      logger.info('Bulk SMS completed', {
        total: phoneNumbers.length,
        successful,
        failed,
        totalCost: recipients.reduce((sum, r) => sum + parseFloat(r.cost || 0), 0)
      });

      return {
        success: true,
        total: phoneNumbers.length,
        successful,
        failed,
        recipients: recipients
      };

    } catch (error) {
      logger.error('Bulk SMS failed', {
        error: error.message,
        recipientCount: phoneNumbers.length
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get SMS delivery status
  async getSMSStatus(messageId) {
    try {
      // Note: Africa's Talking doesn't have a direct status check API
      // This would typically be handled via delivery reports/webhooks
      logger.info('SMS status check requested', { messageId });
      
      return {
        messageId,
        status: 'Sent', // Default status
        note: 'Status tracking via delivery reports'
      };
    } catch (error) {
      logger.error('SMS status check failed', {
        messageId,
        error: error.message
      });
      
      return {
        messageId,
        status: 'Unknown',
        error: error.message
      };
    }
  }
}

module.exports = new SMSService();