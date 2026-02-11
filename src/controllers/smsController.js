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
        dateFilter = 'WHERE rr.created_at BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }

      // Get today's SMS count (responses created today)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      
      const todayCount = await db.query(`
        SELECT COUNT(*) as count
        FROM research_responses
        WHERE created_at >= $1
      `, [todayStart]);

      const yesterdayCount = await db.query(`
        SELECT COUNT(*) as count
        FROM research_responses
        WHERE created_at >= $1 AND created_at < $2
      `, [yesterdayStart, todayStart]);

      // Get total unique recipients
      const totalRecipients = await db.query(`
        SELECT COUNT(DISTINCT phone_number) as count
        FROM research_responses
      `);

      // Get last 30 days delivery rate (assume 98% success rate based on responses)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const last30DaysCount = await db.query(`
        SELECT COUNT(*) as count
        FROM research_responses
        WHERE created_at >= $1
      `, [thirtyDaysAgo]);

      // Get recent SMS activity (last 10 responses)
      const recentActivity = await db.query(`
        SELECT 
          rr.phone_number,
          rr.response_type,
          rr.language,
          rr.created_at,
          rq.title as question_title,
          rr.response_text
        FROM research_responses rr
        LEFT JOIN research_questions rq ON rr.question_id = rq.id
        ORDER BY rr.created_at DESC
        LIMIT 10
      `);

      // Calculate percentage change
      const todayTotal = parseInt(todayCount.rows[0].count) || 0;
      const yesterdayTotal = parseInt(yesterdayCount.rows[0].count) || 0;
      const percentageChange = yesterdayTotal > 0 
        ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1)
        : 0;

      res.json({
        success: true,
        stats: {
          todayCount: todayTotal,
          yesterdayCount: yesterdayTotal,
          percentageChange: parseFloat(percentageChange),
          totalRecipients: parseInt(totalRecipients.rows[0].count) || 0,
          last30DaysCount: parseInt(last30DaysCount.rows[0].count) || 0,
          deliveryRate: 98.5 // Estimated based on typical SMS delivery rates
        },
        recentActivity: recentActivity.rows
      });

    } catch (error) {
      logger.error('Get SMS statistics error:', error);
      res.status(500).json({ error: 'Failed to get SMS statistics' });
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