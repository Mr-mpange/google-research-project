const db = require('../database/connection');
const logger = require('../utils/logger');
const aiService = require('../services/aiService');
const { body, validationResult } = require('express-validator');

class APIController {
  // Get research questions
  async getQuestions(req, res) {
    try {
      const { language = 'en', category, active = true } = req.query;

      let query = 'SELECT * FROM research_questions WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (language) {
        query += ` AND language = $${paramIndex}`;
        params.push(language);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        params.push(active === 'true');
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, params);

      res.json({
        success: true,
        questions: result.rows
      });

    } catch (error) {
      logger.error('Get questions API error:', error);
      res.status(500).json({ error: 'Failed to retrieve questions' });
    }
  }

  // Create research question
  async createQuestion(req, res) {
    try {
      // Validate input
      await body('title').notEmpty().withMessage('Title is required').run(req);
      await body('question_text').notEmpty().withMessage('Question text is required').run(req);
      await body('language').isIn(['en', 'sw']).withMessage('Language must be en or sw').run(req);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { title, description, question_text, category, language = 'en' } = req.body;

      const result = await db.query(`
        INSERT INTO research_questions (title, description, question_text, category, language, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [title, description, question_text, category, language, req.user.userId]);

      logger.info('Question created', { 
        questionId: result.rows[0].id,
        createdBy: req.user.userId 
      });

      res.status(201).json({
        success: true,
        question: result.rows[0]
      });

    } catch (error) {
      logger.error('Create question API error:', error);
      res.status(500).json({ error: 'Failed to create question' });
    }
  }

  // Update research question
  async updateQuestion(req, res) {
    try {
      const { questionId } = req.params;
      const { title, description, question_text, category, is_active } = req.body;

      // Check if question exists
      const existingResult = await db.query('SELECT * FROM research_questions WHERE id = $1', [questionId]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      const result = await db.query(`
        UPDATE research_questions 
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            question_text = COALESCE($3, question_text),
            category = COALESCE($4, category),
            is_active = COALESCE($5, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [title, description, question_text, category, is_active, questionId]);

      logger.info('Question updated', { 
        questionId,
        updatedBy: req.user.userId 
      });

      res.json({
        success: true,
        question: result.rows[0]
      });

    } catch (error) {
      logger.error('Update question API error:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }

  // Delete research question
  async deleteQuestion(req, res) {
    try {
      const { questionId } = req.params;

      // Check if question has responses
      const responsesResult = await db.query('SELECT COUNT(*) FROM research_responses WHERE question_id = $1', [questionId]);
      const responseCount = parseInt(responsesResult.rows[0].count);

      if (responseCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete question with existing responses',
          responseCount 
        });
      }

      const result = await db.query('DELETE FROM research_questions WHERE id = $1 RETURNING *', [questionId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      logger.info('Question deleted', { 
        questionId,
        deletedBy: req.user.userId 
      });

      res.json({
        success: true,
        message: 'Question deleted successfully'
      });

    } catch (error) {
      logger.error('Delete question API error:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }

  // Get responses
  async getResponses(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type, 
        phone, 
        questionId, 
        startDate, 
        endDate,
        includeAI = false 
      } = req.query;
      
      const offset = (page - 1) * limit;

      let query = `
        SELECT r.*, q.title as question_title, q.question_text
        ${includeAI === 'true' ? ', t.transcribed_text, s.summary_text, s.sentiment, s.key_points' : ''}
        FROM research_responses r
        LEFT JOIN research_questions q ON r.question_id = q.id
        ${includeAI === 'true' ? `
          LEFT JOIN transcriptions t ON r.id = t.response_id
          LEFT JOIN ai_summaries s ON r.id = s.response_id
        ` : ''}
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

      if (startDate && endDate) {
        conditions.push(`r.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(startDate, endDate);
        paramIndex += 2;
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

      res.json({
        success: true,
        responses: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Get responses API error:', error);
      res.status(500).json({ error: 'Failed to retrieve responses' });
    }
  }

  // Get specific response with AI analysis
  async getResponse(req, res) {
    try {
      const { responseId } = req.params;

      const result = await db.query(`
        SELECT r.*, q.title as question_title, q.question_text,
               t.transcribed_text, t.confidence_score as transcription_confidence,
               s.summary_text, s.key_points, s.themes, s.sentiment, 
               s.confidence_score as summary_confidence
        FROM research_responses r
        LEFT JOIN research_questions q ON r.question_id = q.id
        LEFT JOIN transcriptions t ON r.id = t.response_id
        LEFT JOIN ai_summaries s ON r.id = s.response_id
        WHERE r.id = $1
      `, [responseId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Response not found' });
      }

      res.json({
        success: true,
        response: result.rows[0]
      });

    } catch (error) {
      logger.error('Get response API error:', error);
      res.status(500).json({ error: 'Failed to retrieve response' });
    }
  }

  // Get analytics summary
  async getAnalytics(req, res) {
    try {
      const { startDate, endDate, granularity = 'day' } = req.query;

      let dateFilter = '';
      const params = [];
      
      if (startDate && endDate) {
        dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }

      // Response statistics
      const responseStats = await db.query(`
        SELECT 
          COUNT(*) as total_responses,
          COUNT(*) FILTER (WHERE response_type = 'ussd') as ussd_responses,
          COUNT(*) FILTER (WHERE response_type = 'voice') as voice_responses,
          COUNT(DISTINCT phone_number) as unique_participants,
          COUNT(DISTINCT question_id) as questions_answered
        FROM research_responses
        ${dateFilter}
      `, params);

      // AI processing statistics
      const aiStats = await db.query(`
        SELECT 
          COUNT(t.id) as total_transcriptions,
          AVG(t.confidence_score) as avg_transcription_confidence,
          COUNT(s.id) as total_summaries,
          AVG(s.confidence_score) as avg_summary_confidence,
          COUNT(*) FILTER (WHERE s.sentiment = 'positive') as positive_responses,
          COUNT(*) FILTER (WHERE s.sentiment = 'negative') as negative_responses,
          COUNT(*) FILTER (WHERE s.sentiment = 'neutral') as neutral_responses
        FROM research_responses r
        LEFT JOIN transcriptions t ON r.id = t.response_id
        LEFT JOIN ai_summaries s ON r.id = s.response_id
        ${dateFilter.replace('created_at', 'r.created_at')}
      `, params);

      // Trends over time
      const trends = await db.query(`
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

      // Top questions by response count
      const topQuestions = await db.query(`
        SELECT q.id, q.title, COUNT(r.id) as response_count
        FROM research_questions q
        LEFT JOIN research_responses r ON q.id = r.question_id
        ${dateFilter.replace('created_at', 'r.created_at')}
        GROUP BY q.id, q.title
        ORDER BY response_count DESC
        LIMIT 10
      `, params);

      res.json({
        success: true,
        analytics: {
          responseStats: responseStats.rows[0],
          aiStats: aiStats.rows[0],
          trends: trends.rows,
          topQuestions: topQuestions.rows
        }
      });

    } catch (error) {
      logger.error('Get analytics API error:', error);
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }

  // Trigger AI processing for unprocessed responses
  async processAI(req, res) {
    try {
      const { limit = 10 } = req.query;

      const processedCount = await aiService.batchProcessRecordings(parseInt(limit));

      res.json({
        success: true,
        message: `Processed ${processedCount} recordings`,
        processedCount
      });

    } catch (error) {
      logger.error('AI processing API error:', error);
      res.status(500).json({ error: 'AI processing failed' });
    }
  }

  // Test AI service (Gemini)
  async testAI(req, res) {
    try {
      const { text = 'This is a test message for AI analysis.' } = req.body;

      // Get AI service status
      const status = aiService.getServiceStatus();

      // Test Gemini if available
      let geminiTest = null;
      if (status.gemini.available) {
        try {
          geminiTest = await aiService.analyzeWithGemini(text, 'summary');
        } catch (error) {
          geminiTest = { error: error.message };
        }
      }

      res.json({
        success: true,
        message: 'AI service test completed',
        status,
        geminiTest,
        testText: text
      });

    } catch (error) {
      logger.error('AI test API error:', error);
      res.status(500).json({ 
        success: false,
        error: 'AI test failed',
        details: error.message 
      });
    }
  }

  // Get system health status
  async getHealth(req, res) {
    try {
      // Check database connection
      const dbResult = await db.query('SELECT NOW()');
      const dbHealthy = dbResult.rows.length > 0;

      // Check recent activity
      const recentActivity = await db.query(`
        SELECT COUNT(*) as count
        FROM research_responses
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);

      // System statistics
      const systemStats = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM research_responses) as total_responses,
          (SELECT COUNT(*) FROM voice_calls) as total_calls,
          (SELECT COUNT(*) FROM ussd_sessions) as total_sessions,
          (SELECT COUNT(*) FROM transcriptions) as total_transcriptions
      `);

      res.json({
        success: true,
        health: {
          database: dbHealthy,
          timestamp: new Date().toISOString(),
          recentActivity: parseInt(recentActivity.rows[0].count),
          systemStats: systemStats.rows[0]
        }
      });

    } catch (error) {
      logger.error('Health check API error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new APIController();