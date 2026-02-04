const db = require('../database/connection');
const logger = require('../utils/logger');
const csv = require('csv-writer');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

class DashboardController {
  // Main dashboard view
  async dashboard(req, res) {
    try {
      // Get overview statistics
      const stats = await this.getOverviewStats();
      
      res.render('dashboard/index', {
        title: 'Research Dashboard',
        user: req.user,
        stats,
        currentPage: 'dashboard'
      });

    } catch (error) {
      logger.error('Dashboard error:', error);
      res.status(500).render('error', { 
        error: 'Failed to load dashboard',
        user: req.user 
      });
    }
  }

  // Analytics page
  async analytics(req, res) {
    try {
      const { startDate, endDate, granularity = 'day' } = req.query;
      
      // Get analytics data
      const analytics = await this.getAnalyticsData(startDate, endDate, granularity);
      
      res.render('dashboard/analytics', {
        title: 'Analytics',
        user: req.user,
        analytics,
        filters: { startDate, endDate, granularity },
        currentPage: 'analytics'
      });

    } catch (error) {
      logger.error('Analytics page error:', error);
      res.status(500).render('error', { 
        error: 'Failed to load analytics',
        user: req.user 
      });
    }
  }

  // Responses page
  async responses(req, res) {
    try {
      const { page = 1, limit = 20, type, phone, questionId } = req.query;
      const offset = (page - 1) * limit;

      // Build query
      let query = `
        SELECT r.*, q.title as question_title, q.question_text,
               t.transcribed_text, s.summary_text, s.sentiment,
               CASE 
                 WHEN r.response_type = 'ussd' THEN us.session_id
                 WHEN r.response_type = 'voice' THEN vc.call_id
               END as session_identifier
        FROM research_responses r
        LEFT JOIN research_questions q ON r.question_id = q.id
        LEFT JOIN transcriptions t ON r.id = t.response_id
        LEFT JOIN ai_summaries s ON r.id = s.response_id
        LEFT JOIN ussd_sessions us ON r.ussd_session_id = us.id
        LEFT JOIN voice_calls vc ON r.voice_call_id = vc.id
      `;

      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (type) {
        conditions.push(`r.response_type = $${paramIndex}`);
        params.push(type);
        paramIndex++;
      }

      if (phone) {
        conditions.push(`r.phone_number LIKE $${paramIndex}`);
        params.push(`%${phone}%`);
        paramIndex++;
      }

      if (questionId) {
        conditions.push(`r.question_id = $${paramIndex}`);
        params.push(questionId);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM research_responses r';
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const countResult = await db.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      // Get questions for filter
      const questionsResult = await db.query(
        'SELECT id, title FROM research_questions WHERE is_active = true ORDER BY title'
      );

      res.render('dashboard/responses', {
        title: 'Research Responses',
        user: req.user,
        responses: result.rows,
        questions: questionsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        filters: { type, phone, questionId },
        currentPage: 'responses'
      });

    } catch (error) {
      logger.error('Responses page error:', error);
      res.status(500).render('error', { 
        error: 'Failed to load responses',
        user: req.user 
      });
    }
  }

  // Voice calls page
  async calls(req, res) {
    try {
      const { page = 1, limit = 20, status, phone } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT v.*, COUNT(r.id) as response_count
        FROM voice_calls v
        LEFT JOIN research_responses r ON v.id = r.voice_call_id
      `;

      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`v.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (phone) {
        conditions.push(`v.phone_number LIKE $${paramIndex}`);
        params.push(`%${phone}%`);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` GROUP BY v.id ORDER BY v.started_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM voice_calls v';
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const countResult = await db.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      res.render('dashboard/calls', {
        title: 'Voice Calls',
        user: req.user,
        calls: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        filters: { status, phone },
        currentPage: 'calls'
      });

    } catch (error) {
      logger.error('Calls page error:', error);
      res.status(500).render('error', { 
        error: 'Failed to load calls',
        user: req.user 
      });
    }
  }

  // Transcriptions page
  async transcriptions(req, res) {
    try {
      const { page = 1, limit = 20, confidence, language } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT t.*, r.phone_number, r.created_at as response_date,
               s.summary_text, s.sentiment, s.key_points
        FROM transcriptions t
        JOIN research_responses r ON t.response_id = r.id
        LEFT JOIN ai_summaries s ON r.id = s.response_id
      `;

      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (confidence) {
        const minConfidence = parseFloat(confidence);
        conditions.push(`t.confidence_score >= $${paramIndex}`);
        params.push(minConfidence);
        paramIndex++;
      }

      if (language) {
        conditions.push(`t.language_detected = $${paramIndex}`);
        params.push(language);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM transcriptions t JOIN research_responses r ON t.response_id = r.id';
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const countResult = await db.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      res.render('dashboard/transcriptions', {
        title: 'AI Transcriptions',
        user: req.user,
        transcriptions: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        filters: { confidence, language },
        currentPage: 'transcriptions'
      });

    } catch (error) {
      logger.error('Transcriptions page error:', error);
      res.status(500).render('error', { 
        error: 'Failed to load transcriptions',
        user: req.user 
      });
    }
  }

  // Research questions management
  async questions(req, res) {
    try {
      const questionsResult = await db.query(`
        SELECT q.*, u.full_name as created_by_name,
               COUNT(r.id) as response_count
        FROM research_questions q
        LEFT JOIN users u ON q.created_by = u.id
        LEFT JOIN research_responses r ON q.id = r.question_id
        GROUP BY q.id, u.full_name
        ORDER BY q.created_at DESC
      `);

      res.render('dashboard/questions', {
        title: 'Research Questions',
        user: req.user,
        questions: questionsResult.rows,
        currentPage: 'questions'
      });

    } catch (error) {
      logger.error('Questions page error:', error);
      res.status(500).render('error', { 
        error: 'Failed to load questions',
        user: req.user 
      });
    }
  }

  // Users management (admin only)
  async users(req, res) {
    try {
      const usersResult = await db.query(`
        SELECT id, username, email, full_name, role, is_active, created_at
        FROM users
        ORDER BY created_at DESC
      `);

      res.render('dashboard/users', {
        title: 'User Management',
        user: req.user,
        users: usersResult.rows,
        currentPage: 'users'
      });

    } catch (error) {
      logger.error('Users page error:', error);
      res.status(500).render('error', { 
        error: 'Failed to load users',
        user: req.user 
      });
    }
  }

  // Research campaigns
  async campaigns(req, res) {
    try {
      const campaignsResult = await db.query(`
        SELECT c.*, u.full_name as created_by_name,
               COUNT(DISTINCT cq.question_id) as question_count,
               COUNT(DISTINCT r.id) as response_count
        FROM research_campaigns c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN campaign_questions cq ON c.id = cq.campaign_id
        LEFT JOIN research_responses r ON cq.question_id = r.question_id
        GROUP BY c.id, u.full_name
        ORDER BY c.created_at DESC
      `);

      res.render('dashboard/campaigns', {
        title: 'Research Campaigns',
        user: req.user,
        campaigns: campaignsResult.rows,
        currentPage: 'campaigns'
      });

    } catch (error) {
      logger.error('Campaigns page error:', error);
      res.status(500).render('error', { 
        error: 'Failed to load campaigns',
        user: req.user 
      });
    }
  }

  // Export responses to CSV
  async exportResponses(req, res) {
    try {
      const { format = 'csv', type, startDate, endDate } = req.query;

      // Get responses data
      let query = `
        SELECT r.*, q.title as question_title, q.question_text,
               t.transcribed_text, s.summary_text, s.sentiment, s.key_points
        FROM research_responses r
        LEFT JOIN research_questions q ON r.question_id = q.id
        LEFT JOIN transcriptions t ON r.id = t.response_id
        LEFT JOIN ai_summaries s ON r.id = s.response_id
      `;

      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (type) {
        conditions.push(`r.response_type = $${paramIndex}`);
        params.push(type);
        paramIndex++;
      }

      if (startDate && endDate) {
        conditions.push(`r.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(startDate, endDate);
        paramIndex += 2;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY r.created_at DESC';

      const result = await db.query(query, params);

      if (format === 'csv') {
        await this.exportToCSV(res, result.rows, 'responses');
      } else if (format === 'pdf') {
        await this.exportToPDF(res, result.rows, 'Research Responses Report');
      } else {
        res.status(400).json({ error: 'Unsupported format' });
      }

    } catch (error) {
      logger.error('Export responses error:', error);
      res.status(500).json({ error: 'Export failed' });
    }
  }

  // Export analytics to CSV/PDF
  async exportAnalytics(req, res) {
    try {
      const { format = 'csv', startDate, endDate } = req.query;

      const analytics = await this.getAnalyticsData(startDate, endDate, 'day');

      if (format === 'csv') {
        await this.exportAnalyticsToCSV(res, analytics);
      } else if (format === 'pdf') {
        await this.exportAnalyticsToPDF(res, analytics);
      } else {
        res.status(400).json({ error: 'Unsupported format' });
      }

    } catch (error) {
      logger.error('Export analytics error:', error);
      res.status(500).json({ error: 'Export failed' });
    }
  }

  // Helper: Get overview statistics
  async getOverviewStats() {
    const stats = {};

    // Total responses
    const responsesResult = await db.query('SELECT COUNT(*) as total FROM research_responses');
    stats.totalResponses = parseInt(responsesResult.rows[0].total);

    // Total participants
    const participantsResult = await db.query('SELECT COUNT(DISTINCT phone_number) as total FROM research_responses');
    stats.totalParticipants = parseInt(participantsResult.rows[0].total);

    // Voice calls
    const callsResult = await db.query('SELECT COUNT(*) as total FROM voice_calls');
    stats.totalCalls = parseInt(callsResult.rows[0].total);

    // USSD sessions
    const ussdResult = await db.query('SELECT COUNT(*) as total FROM ussd_sessions');
    stats.totalUSSDSessions = parseInt(ussdResult.rows[0].total);

    // AI processing stats
    const aiResult = await db.query(`
      SELECT 
        COUNT(t.id) as transcriptions,
        COUNT(s.id) as summaries,
        AVG(t.confidence_score) as avg_confidence
      FROM transcriptions t
      FULL OUTER JOIN ai_summaries s ON t.response_id = s.response_id
    `);
    stats.aiStats = aiResult.rows[0];

    // Recent activity (last 24 hours)
    const recentResult = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_responses,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as week_responses
      FROM research_responses
    `);
    stats.recentActivity = recentResult.rows[0];

    return stats;
  }

  // Helper: Get analytics data
  async getAnalyticsData(startDate, endDate, granularity) {
    const analytics = {};

    // Date filter
    let dateFilter = '';
    const params = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    // Response trends
    const trendsResult = await db.query(`
      SELECT 
        DATE_TRUNC('${granularity}', created_at) as period,
        COUNT(*) as responses,
        COUNT(*) FILTER (WHERE response_type = 'ussd') as ussd_responses,
        COUNT(*) FILTER (WHERE response_type = 'voice') as voice_responses
      FROM research_responses
      ${dateFilter}
      GROUP BY period
      ORDER BY period
    `, params);
    analytics.trends = trendsResult.rows;

    // Response types distribution
    const typesResult = await db.query(`
      SELECT response_type, COUNT(*) as count
      FROM research_responses
      ${dateFilter}
      GROUP BY response_type
    `, params);
    analytics.responseTypes = typesResult.rows;

    // Language distribution
    const languageResult = await db.query(`
      SELECT language, COUNT(*) as count
      FROM research_responses
      ${dateFilter}
      GROUP BY language
    `, params);
    analytics.languages = languageResult.rows;

    // Sentiment analysis
    const sentimentResult = await db.query(`
      SELECT s.sentiment, COUNT(*) as count
      FROM ai_summaries s
      JOIN research_responses r ON s.response_id = r.id
      ${dateFilter.replace('created_at', 'r.created_at')}
      GROUP BY s.sentiment
    `, params);
    analytics.sentiment = sentimentResult.rows;

    return analytics;
  }

  // Helper: Export to CSV
  async exportToCSV(res, data, filename) {
    const csvWriter = csv.createObjectCsvStringifier({
      header: Object.keys(data[0] || {}).map(key => ({ id: key, title: key }))
    });

    const csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${Date.now()}.csv"`);
    res.send(csvString);
  }

  // Helper: Export to PDF
  async exportToPDF(res, data, title) {
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}_${Date.now()}.pdf"`);
    
    doc.pipe(res);
    
    // Add title
    doc.fontSize(20).text(title, 50, 50);
    doc.moveDown();
    
    // Add data (simplified)
    data.slice(0, 50).forEach((item, index) => {
      doc.fontSize(10).text(`${index + 1}. ${JSON.stringify(item)}`, 50, doc.y);
      doc.moveDown(0.5);
    });
    
    doc.end();
  }

  // Helper: Export analytics to CSV
  async exportAnalyticsToCSV(res, analytics) {
    // Combine all analytics data
    const exportData = {
      trends: analytics.trends,
      responseTypes: analytics.responseTypes,
      languages: analytics.languages,
      sentiment: analytics.sentiment
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="analytics_${Date.now()}.json"`);
    res.json(exportData);
  }

  // Helper: Export analytics to PDF
  async exportAnalyticsToPDF(res, analytics) {
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="analytics_report_${Date.now()}.pdf"`);
    
    doc.pipe(res);
    
    doc.fontSize(20).text('Research Analytics Report', 50, 50);
    doc.moveDown();
    
    // Add analytics sections
    doc.fontSize(14).text('Response Trends:', 50, doc.y);
    analytics.trends.forEach(trend => {
      doc.fontSize(10).text(`${trend.period}: ${trend.responses} responses`, 70, doc.y);
    });
    
    doc.end();
  }
}

module.exports = new DashboardController();