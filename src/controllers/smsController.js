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
      const { phoneNumber, message, language = 'en', questionTitle } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          error: 'Phone number is required'
        });
      }

      // If custom message provided, use it; otherwise use default thank you message
      let smsMessage = message;
      let result;

      if (smsMessage) {
        // Send custom message directly
        result = await smsService.sendCustomSMS(phoneNumber, smsMessage, language);
      } else {
        // Send default thank you message
        result = await smsService.sendThankYouSMS(phoneNumber, language, {
          questionTitle: questionTitle || 'Research Question'
        });
      }

      if (result.success) {
        // Log to SMS history
        await db.query(`
          INSERT INTO sms_history (phone_number, message, message_type, status, message_id, cost, status_code, language, sent_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          result.phoneNumber,
          smsMessage || result.message || 'Thank you SMS',
          'manual',
          'sent',
          result.messageId,
          result.cost,
          result.statusCode,
          language,
          req.user?.userId || null
        ]);

        res.json({
          message: 'SMS sent successfully',
          messageId: result.messageId,
          status: result.status,
          cost: result.cost
        });
      } else {
        // Log failed attempt
        await db.query(`
          INSERT INTO sms_history (phone_number, message, message_type, status, language, sent_by, failure_reason)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          phoneNumber,
          smsMessage || 'Thank you SMS',
          'manual',
          'failed',
          language,
          req.user?.userId || null,
          result.error
        ]);

        res.status(500).json({
          error: 'Failed to send SMS',
          details: result.error
        });
      }

    } catch (error) {
      logger.error('Send thank you SMS error:', error);
      res.status(500).json({
        error: 'Failed to send SMS',
        details: error.message
      });
    }
  }

  // Get SMS statistics
  async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // Get today's SMS count (from sms_history)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      
      const todayCount = await db.query(`
        SELECT COUNT(*) as count
        FROM sms_history
        WHERE sent_at >= $1 AND status = 'sent'
      `, [todayStart]);

      const yesterdayCount = await db.query(`
        SELECT COUNT(*) as count
        FROM sms_history
        WHERE sent_at >= $1 AND sent_at < $2 AND status = 'sent'
      `, [yesterdayStart, todayStart]);

      // Get total unique recipients
      const totalRecipients = await db.query(`
        SELECT COUNT(DISTINCT phone_number) as count
        FROM sms_history
        WHERE status = 'sent'
      `);

      // Get last 30 days count and calculate delivery rate
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const last30DaysStats = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM sms_history
        WHERE sent_at >= $1
      `, [thirtyDaysAgo]);

      const totalSent = parseInt(last30DaysStats.rows[0].sent) || 0;
      const totalAttempted = parseInt(last30DaysStats.rows[0].total) || 1;
      const deliveryRate = ((totalSent / totalAttempted) * 100).toFixed(1);

      // Get recent SMS activity (last 10 sent messages)
      const recentActivity = await db.query(`
        SELECT 
          sh.phone_number,
          sh.message,
          sh.message_type,
          sh.status,
          sh.sent_at as created_at,
          sh.cost,
          u.username as sent_by_username
        FROM sms_history sh
        LEFT JOIN users u ON sh.sent_by = u.id
        WHERE sh.status = 'sent'
        ORDER BY sh.sent_at DESC
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
          last30DaysCount: totalSent,
          deliveryRate: parseFloat(deliveryRate)
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
      const { message, phoneNumbers, language = 'en', targetGroup = 'all' } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Message content is required'
        });
      }

      let recipientNumbers = [];

      // If phoneNumbers array is provided (from frontend selection), use it
      if (phoneNumbers && Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
        recipientNumbers = phoneNumbers;
        logger.info('Using provided phone numbers', {
          count: phoneNumbers.length
        });
      } else {
        // Otherwise, get phone numbers based on target group from database
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
        recipientNumbers = phoneNumbersResult.rows.map(row => row.phone_number);
      }

      if (recipientNumbers.length === 0) {
        return res.status(400).json({
          error: 'No phone numbers found for the specified criteria'
        });
      }

      logger.info('Sending bulk SMS', {
        recipientCount: recipientNumbers.length,
        targetGroup,
        language,
        messageLength: message.length
      });

      const result = await smsService.sendBulkSMS(recipientNumbers, message, language);

      // Log each SMS to history
      if (result.success && result.recipients) {
        const insertPromises = result.recipients.map(recipient => {
          return db.query(`
            INSERT INTO sms_history (phone_number, message, message_type, status, message_id, cost, status_code, language, sent_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            recipient.number || recipient.phoneNumber,
            message,
            'bulk',
            recipient.status === 'Success' ? 'sent' : 'failed',
            recipient.messageId,
            recipient.cost,
            recipient.statusCode,
            language,
            req.user?.userId || null
          ]);
        });

        await Promise.all(insertPromises);
      }

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