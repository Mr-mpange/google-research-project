const db = require('../database/connection');
const logger = require('../utils/logger');
const ussdService = require('../services/ussdService');
const voiceService = require('../services/voiceService');

class USSDController {
  // Main USSD callback handler
  async handleCallback(req, res) {
    try {
      const { sessionId, serviceCode, phoneNumber, text } = req.body;
      
      logger.ussd(phoneNumber, 'callback_received', {
        sessionId,
        serviceCode,
        text: text || 'initial'
      });

      // Get or create session
      let session = await ussdService.getSession(sessionId);
      if (!session) {
        session = await ussdService.createSession(sessionId, phoneNumber, serviceCode);
      }

      // Update session activity
      await ussdService.updateSessionActivity(sessionId);

      // Process USSD input and get response
      const response = await ussdService.processInput(session, text || '');
      
      logger.ussd(phoneNumber, 'response_sent', {
        sessionId,
        responseType: response.type,
        menuLevel: response.menuLevel
      });

      // Send response based on type
      if (response.type === 'END') {
        await ussdService.endSession(sessionId);
        res.send(`END ${response.message}`);
      } else {
        res.send(`CON ${response.message}`);
      }

    } catch (error) {
      logger.error('USSD callback error:', error);
      res.send('END Sorry, there was an error processing your request. Please try again later.');
    }
  }

  // Get USSD sessions (for admin/analytics)
  async getSessions(req, res) {
    try {
      const { page = 1, limit = 50, phone, active } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT s.*, 
               COUNT(r.id) as response_count,
               MAX(r.created_at) as last_response
        FROM ussd_sessions s
        LEFT JOIN research_responses r ON s.id = r.ussd_session_id
      `;
      
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (phone) {
        conditions.push(`s.phone_number LIKE $${paramIndex}`);
        params.push(`%${phone}%`);
        paramIndex++;
      }

      if (active !== undefined) {
        conditions.push(`s.is_active = $${paramIndex}`);
        params.push(active === 'true');
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += `
        GROUP BY s.id
        ORDER BY s.started_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM ussd_sessions s';
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const countResult = await db.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      res.json({
        sessions: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Get sessions error:', error);
      res.status(500).json({ error: 'Failed to retrieve sessions' });
    }
  }

  // Get specific USSD session
  async getSession(req, res) {
    try {
      const { sessionId } = req.params;

      const sessionQuery = `
        SELECT s.*,
               json_agg(
                 json_build_object(
                   'id', r.id,
                   'question_id', r.question_id,
                   'response_text', r.response_text,
                   'created_at', r.created_at
                 ) ORDER BY r.created_at
               ) FILTER (WHERE r.id IS NOT NULL) as responses
        FROM ussd_sessions s
        LEFT JOIN research_responses r ON s.id = r.ussd_session_id
        WHERE s.session_id = $1
        GROUP BY s.id
      `;

      const result = await db.query(sessionQuery, [sessionId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(result.rows[0]);

    } catch (error) {
      logger.error('Get session error:', error);
      res.status(500).json({ error: 'Failed to retrieve session' });
    }
  }

  // Get USSD analytics
  async getAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // Base analytics query
      let dateFilter = '';
      const params = [];
      
      if (startDate && endDate) {
        dateFilter = 'WHERE s.started_at BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }

      // Get session statistics
      const sessionStats = await db.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(*) FILTER (WHERE is_active = true) as active_sessions,
          COUNT(*) FILTER (WHERE is_active = false) as completed_sessions,
          AVG(total_interactions) as avg_interactions,
          AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_duration_seconds
        FROM ussd_sessions s
        ${dateFilter}
      `, params);

      // Get response statistics
      const responseStats = await db.query(`
        SELECT 
          COUNT(*) as total_responses,
          COUNT(DISTINCT phone_number) as unique_participants,
          response_type,
          COUNT(*) as count
        FROM research_responses r
        JOIN ussd_sessions s ON r.ussd_session_id = s.id
        ${dateFilter.replace('s.started_at', 'r.created_at')}
        GROUP BY response_type
      `, params);

      // Get popular menu paths
      const menuPaths = await db.query(`
        SELECT 
          current_menu,
          COUNT(*) as visits
        FROM ussd_sessions s
        ${dateFilter}
        GROUP BY current_menu
        ORDER BY visits DESC
        LIMIT 10
      `, params);

      // Get hourly distribution
      const hourlyDistribution = await db.query(`
        SELECT 
          EXTRACT(HOUR FROM started_at) as hour,
          COUNT(*) as sessions
        FROM ussd_sessions s
        ${dateFilter}
        GROUP BY EXTRACT(HOUR FROM started_at)
        ORDER BY hour
      `, params);

      res.json({
        sessionStats: sessionStats.rows[0],
        responseStats: responseStats.rows,
        menuPaths: menuPaths.rows,
        hourlyDistribution: hourlyDistribution.rows
      });

    } catch (error) {
      logger.error('Get analytics error:', error);
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }
}

module.exports = new USSDController();