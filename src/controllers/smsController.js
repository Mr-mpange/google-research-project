const smsService = require('../services/smsService');
const db = require('../database/connection');
const logger = require('../utils/logger');

class SMSController {
  // Send research invitation to participants
  async sendInvitation(req, res) {
    try {
      const { phoneNumbers, language = 'en' } = req.body;

      if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return res.status(400).json({
          error: 'Phone numbers array is required'
        });
      }

      logger.info('Sending research invitations', {
        count: phoneNumbers.length,
        language
      });

      const results = [];
      
      for (const phoneNumber of phoneNumbers) {
        try {
          const result = await smsService.sendResearchInvitation(phoneNumber, language);
          results.push({
            phoneNumber,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          });
        } catch (error) {
          results.push({
            phoneNumber,
            success: false,
            error: error.message
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        message: 'Invitation SMS sending completed',
        total: phoneNumbers.length,
        successful,
        failed,
        results
      });

    } catch (error) {
      logger.error('Send invitation error:', error);
      res.status(500).json({
        error: 'Failed to send invitations',
        details: error.message
      });
    }
  }

  // Send thank you SMS manually (for testing or admin use)
  async sendThankYou(req, res) {
    try {
      const { phoneNumber, language = 'en', questionTitle } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          error: 'Phone number is required'
        });
      }

      const result = await smsService.sendThankYouSMS(phoneNumber, language, {
        questionTitle: questionTitle || 'Research Question'
      });

      if (result.success) {
        res.json({
          message: 'Thank you SMS sent successfully',
          messageId: result.messageId,
          status: result.status,
          cost: result.cost
        });
      } else {
        res.status(500).json({
          error: 'Failed to send thank you SMS',
          details: result.error
        });
      }

    } catch (error) {
      logger.error('Send thank you SMS error:', error);
      res.status(500).json({
        error: 'Failed to send thank you SMS',
        details: error.message
      });
    }
  }

  // Get SMS statistics
  async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      let dateFilter = '';
      const params = [];
      
      if (startDate && endDate) {
        dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }

      // Get response statistics (proxy for SMS sent)
      const responseStats = await db.query(`
        SELECT 
          COUNT(*) as total_responses,
          COUNT(DISTINCT phone_number) as unique_participants,
          language,
          COUNT(*) as count
        FROM research_responses
        ${dateFilter}
        GROUP BY language
        ORDER BY count DESC
      `, params);

      // Get recent activity
      const recentActivity = await db.query(`
        SELECT 
          phone_number,
          response_type,
          language,
          created_at
        FROM research_responses
        ${dateFilter}
        ORDER BY created_at DESC
        LIMIT 10
      `, params);

      res.json({
        message: 'SMS statistics retrieved',
        responseStats: responseStats.rows,
        recentActivity: recentActivity.rows,
        note: 'SMS statistics are estimated based on research responses'
      });

    } catch (error) {
      logger.error('Get SMS statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve SMS statistics',
        details: error.message
      });
    }
  }

  // Send bulk SMS to all participants
  async sendBulkMessage(req, res) {
    try {
      const { message, language = 'en', targetGroup = 'all' } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Message content is required'
        });
      }

      // Get phone numbers based on target group
      let phoneNumbersQuery = `
        SELECT DISTINCT phone_number 
        FROM research_responses 
        WHERE phone_number IS NOT NULL
      `;
      
      const params = [];
      
      if (targetGroup === 'recent') {
        phoneNumbersQuery += ` AND created_at >= NOW() - INTERVAL '7 days'`;
      } else if (targetGroup === 'language') {
        phoneNumbersQuery += ` AND language = $1`;
        params.push(language);
      }
      
      phoneNumbersQuery += ` ORDER BY phone_number`;

      const phoneNumbersResult = await db.query(phoneNumbersQuery, params);
      const phoneNumbers = phoneNumbersResult.rows.map(row => row.phone_number);

      if (phoneNumbers.length === 0) {
        return res.status(400).json({
          error: 'No phone numbers found for the specified criteria'
        });
      }

      logger.info('Sending bulk SMS', {
        recipientCount: phoneNumbers.length,
        targetGroup,
        language,
        messageLength: message.length
      });

      const result = await smsService.sendBulkSMS(phoneNumbers, message, language);

      res.json({
        message: 'Bulk SMS sending completed',
        ...result
      });

    } catch (error) {
      logger.error('Send bulk SMS error:', error);
      res.status(500).json({
        error: 'Failed to send bulk SMS',
        details: error.message
      });
    }
  }

  // Handle SMS delivery reports (webhook)
  async handleDeliveryReport(req, res) {
    try {
      const { id, status, phoneNumber, failureReason } = req.body;

      logger.info('SMS delivery report received', {
        messageId: id,
        status,
        phoneNumber,
        failureReason
      });

      // Here you could update a database table to track SMS delivery status
      // For now, we'll just log it

      res.json({
        message: 'Delivery report processed',
        messageId: id,
        status
      });

    } catch (error) {
      logger.error('Handle delivery report error:', error);
      res.status(500).json({
        error: 'Failed to process delivery report',
        details: error.message
      });
    }
  }

  // Test Africa's Talking connection
  async testConnection(req, res) {
    try {
      logger.info('Testing Africa\'s Talking connection via API');
      
      const result = await smsService.testConnection();
      
      res.json({
        message: 'Connection test completed',
        ...result
      });

    } catch (error) {
      logger.error('Connection test error:', error);
      res.status(500).json({
        error: 'Connection test failed',
        details: error.message
      });
    }
  }
}

module.exports = new SMSController();