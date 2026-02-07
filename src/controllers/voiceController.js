const db = require('../database/connection');
const logger = require('../utils/logger');
const voiceService = require('../services/voiceService');
const aiService = require('../services/aiService');

class VoiceController {
  // Handle Africa's Talking voice callback
  async handleCallback(req, res) {
    try {
      const { sessionId, phoneNumber, isActive, dtmfDigits } = req.body;
      
      logger.voice(phoneNumber, 'callback_received', {
        sessionId,
        isActive,
        dtmfDigits
      });

      // Generate voice response XML
      const response = await voiceService.generateVoiceResponse({
        sessionId,
        phoneNumber,
        isActive,
        dtmfDigits
      });

      res.set('Content-Type', 'application/xml');
      res.send(response);

    } catch (error) {
      logger.error('Voice callback error:', error);
      res.status(500).send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Sorry, there was an error. Please try again later.</Say>
          <Hangup/>
        </Response>
      `);
    }
  }

  // Handle call status updates
  async handleStatusUpdate(req, res) {
    try {
      const { sessionId, status, durationInSeconds, hangupCause } = req.body;
      
      logger.voice('system', 'status_update', {
        sessionId,
        status,
        duration: durationInSeconds,
        hangupCause
      });

      await voiceService.updateCallStatus(sessionId, status, {
        durationInSeconds,
        hangupCause,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });

    } catch (error) {
      logger.error('Voice status update error:', error);
      res.status(500).json({ error: 'Status update failed' });
    }
  }

  // Handle recording callback
  async handleRecording(req, res) {
    try {
      const { sessionId, recordingUrl, durationInSeconds, channels } = req.body;
      
      logger.voice('system', 'recording_received', {
        sessionId,
        recordingUrl,
        duration: durationInSeconds
      });

      // Save recording
      await voiceService.saveRecording(sessionId, recordingUrl, {
        durationInSeconds,
        channels,
        timestamp: new Date().toISOString()
      });

      // Process with AI (async)
      setImmediate(async () => {
        try {
          const call = await voiceService.getCallBySessionId(sessionId);
          if (call) {
            await aiService.processVoiceRecording(sessionId, recordingUrl, call.phone_number);
          }
        } catch (error) {
          logger.error('AI processing error:', error);
        }
      });

      // Generate response for next question or completion
      const response = await voiceService.generateVoiceResponse({
        sessionId,
        phoneNumber: req.body.callerNumber || req.body.phoneNumber,
        isActive: true
      });

      res.set('Content-Type', 'application/xml');
      res.send(response);

    } catch (error) {
      logger.error('Recording callback error:', error);
      res.status(500).json({ error: 'Recording processing failed' });
    }
  }

  // Get voice calls (for admin/analytics)
  async getCalls(req, res) {
    try {
      const { page = 1, limit = 50, phone, status, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT v.*, 
               COUNT(r.id) as response_count,
               MAX(r.created_at) as last_response
        FROM voice_calls v
        LEFT JOIN research_responses r ON v.id = r.voice_call_id
      `;
      
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (phone) {
        conditions.push(`v.phone_number LIKE $${paramIndex}`);
        params.push(`%${phone}%`);
        paramIndex++;
      }

      if (status) {
        conditions.push(`v.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (startDate && endDate) {
        conditions.push(`v.started_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(startDate, endDate);
        paramIndex += 2;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += `
        GROUP BY v.id
        ORDER BY v.started_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM voice_calls v';
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const countResult = await db.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      res.json({
        calls: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Get calls error:', error);
      res.status(500).json({ error: 'Failed to retrieve calls' });
    }
  }

  // Get specific voice call
  async getCall(req, res) {
    try {
      const { callId } = req.params;

      const callQuery = `
        SELECT v.*,
               json_agg(
                 json_build_object(
                   'id', r.id,
                   'question_id', r.question_id,
                   'response_text', r.response_text,
                   'audio_file_path', r.audio_file_path,
                   'created_at', r.created_at,
                   'transcription', t.transcribed_text,
                   'summary', s.summary_text
                 ) ORDER BY r.created_at
               ) FILTER (WHERE r.id IS NOT NULL) as responses
        FROM voice_calls v
        LEFT JOIN research_responses r ON v.id = r.voice_call_id
        LEFT JOIN transcriptions t ON r.id = t.response_id
        LEFT JOIN ai_summaries s ON r.id = s.response_id
        WHERE v.call_id = $1
        GROUP BY v.id
      `;

      const result = await db.query(callQuery, [callId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Call not found' });
      }

      res.json(result.rows[0]);

    } catch (error) {
      logger.error('Get call error:', error);
      res.status(500).json({ error: 'Failed to retrieve call' });
    }
  }

  // Get voice analytics
  async getAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      let dateFilter = '';
      const params = [];
      
      if (startDate && endDate) {
        dateFilter = 'WHERE v.started_at BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }

      // Get call statistics
      const callStats = await db.query(`
        SELECT 
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE status = 'Completed') as completed_calls,
          COUNT(*) FILTER (WHERE status = 'Failed') as failed_calls,
          COUNT(*) FILTER (WHERE status = 'NoAnswer') as no_answer_calls,
          AVG(duration) FILTER (WHERE duration > 0) as avg_duration_seconds,
          SUM(duration) as total_duration_seconds
        FROM voice_calls v
        ${dateFilter}
      `, params);

      // Get response statistics
      const responseStats = await db.query(`
        SELECT 
          COUNT(*) as total_responses,
          COUNT(DISTINCT phone_number) as unique_participants,
          AVG(audio_duration) FILTER (WHERE audio_duration > 0) as avg_response_duration
        FROM research_responses r
        JOIN voice_calls v ON r.voice_call_id = v.id
        ${dateFilter.replace('v.started_at', 'r.created_at')}
        WHERE r.response_type = 'voice'
      `, params);

      // Get AI processing statistics
      const aiStats = await db.query(`
        SELECT 
          COUNT(t.id) as total_transcriptions,
          AVG(t.confidence_score) as avg_transcription_confidence,
          COUNT(s.id) as total_summaries,
          AVG(s.confidence_score) as avg_summary_confidence
        FROM research_responses r
        JOIN voice_calls v ON r.voice_call_id = v.id
        LEFT JOIN transcriptions t ON r.id = t.response_id
        LEFT JOIN ai_summaries s ON r.id = s.response_id
        ${dateFilter.replace('v.started_at', 'r.created_at')}
        WHERE r.response_type = 'voice'
      `, params);

      // Get hourly distribution
      const hourlyDistribution = await db.query(`
        SELECT 
          EXTRACT(HOUR FROM started_at) as hour,
          COUNT(*) as calls
        FROM voice_calls v
        ${dateFilter}
        GROUP BY EXTRACT(HOUR FROM started_at)
        ORDER BY hour
      `, params);

      res.json({
        callStats: callStats.rows[0],
        responseStats: responseStats.rows[0],
        aiStats: aiStats.rows[0],
        hourlyDistribution: hourlyDistribution.rows
      });

    } catch (error) {
      logger.error('Get voice analytics error:', error);
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }

  // Initiate outbound call
  async initiateCall(req, res) {
    try {
      const { phoneNumber, language = 'en' } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      const callId = await voiceService.initiateCall(phoneNumber, language);

      res.json({
        success: true,
        callId,
        message: 'Call initiated successfully'
      });

    } catch (error) {
      logger.error('Initiate call error:', error);
      res.status(500).json({ error: 'Failed to initiate call' });
    }
  }
}

module.exports = new VoiceController();