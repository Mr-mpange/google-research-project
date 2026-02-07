const AfricasTalking = require('africastalking');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class VoiceService {
  constructor() {
    this.client = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME
    });
    
    this.voice = this.client.VOICE;
    this.callStates = new Map(); // Track call states
  }

  // Initiate outbound call
  async initiateCall(phoneNumber, language = 'en') {
    try {
      const callId = uuidv4();
      
      // Save call record
      await db.query(`
        INSERT INTO voice_calls (call_id, phone_number, direction, status, language)
        VALUES ($1, $2, $3, $4, $5)
      `, [callId, phoneNumber, 'outbound', 'initiated', language]);

      // Make the call
      const callOptions = {
        to: phoneNumber,
        from: process.env.AT_VOICE_NUMBER,
        callbackUrl: `${process.env.BASE_URL || 'https://your-domain.com'}/voice/callback`
      };

      const result = await this.voice.call(callOptions);
      
      logger.voice(phoneNumber, 'call_initiated', {
        callId,
        result: result.entries?.[0]
      });

      // Update call with Africa's Talking session ID if available
      if (result.entries?.[0]?.sessionId) {
        await db.query(`
          UPDATE voice_calls 
          SET metadata = jsonb_set(metadata, '{at_session_id}', $1)
          WHERE call_id = $2
        `, [JSON.stringify(result.entries[0].sessionId), callId]);
      }

      return callId;

    } catch (error) {
      logger.error('Initiate call error:', error);
      throw error;
    }
  }

  // Generate voice response XML
  async generateVoiceResponse(callData) {
    try {
      const { sessionId, phoneNumber, isActive, dtmfDigits } = callData;
      
      // Get or create call record
      let call = await this.getCallBySessionId(sessionId);
      if (!call) {
        call = await this.createCallRecord(sessionId, phoneNumber, 'inbound');
      }

      const language = call.language || 'en';
      const callState = this.callStates.get(sessionId) || { step: 'welcome' };

      logger.voice(phoneNumber, 'generating_response', {
        sessionId,
        step: callState.step,
        language,
        dtmfDigits
      });

      let response = '<?xml version="1.0" encoding="UTF-8"?><Response>';

      switch (callState.step) {
        case 'welcome':
          response += this.generateWelcomeResponse(language);
          this.callStates.set(sessionId, { step: 'menu', language });
          break;

        case 'menu':
          response += this.generateMenuResponse(language);
          this.callStates.set(sessionId, { step: 'waiting_input', language });
          break;

        case 'waiting_input':
          // Handle menu selection
          if (dtmfDigits === '1') {
            // Start sequential questions
            const questions = await this.getActiveQuestions(language);
            if (questions.length === 0) {
              response += `<Say voice="woman">${language === 'sw' ? 'Hakuna maswali ya utafiti kwa sasa.' : 'No research questions available at the moment.'}</Say><Hangup/>`;
            } else {
              this.callStates.set(sessionId, { 
                step: 'sequential_questions',
                language,
                questions,
                currentQuestionIndex: 0,
                answers: []
              });
              response += this.generateQuestionResponse(questions[0], language, 1, questions.length);
            }
          } else {
            response += this.generateDefaultResponse(language);
          }
          break;

        case 'sequential_questions':
          // This step is reached after recording is complete
          const nextIndex = callState.currentQuestionIndex + 1;
          
          if (nextIndex < callState.questions.length) {
            // More questions to ask
            const nextQuestion = callState.questions[nextIndex];
            this.callStates.set(sessionId, {
              ...callState,
              currentQuestionIndex: nextIndex
            });
            response += this.generateQuestionResponse(nextQuestion, language, nextIndex + 1, callState.questions.length);
          } else {
            // All questions completed
            response += this.generateCompleteResponse(language);
            this.callStates.delete(sessionId);
          }
          break;

        case 'recording':
          response += this.generateRecordingResponse(language);
          this.callStates.set(sessionId, { ...callState, step: 'complete' });
          break;

        case 'complete':
          response += this.generateCompleteResponse(language);
          break;

        default:
          response += this.generateDefaultResponse(language);
      }

      response += '</Response>';
      return response;

    } catch (error) {
      logger.error('Generate voice response error:', error);
      return `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Sorry, there was an error. Please try again later.</Say>
          <Hangup/>
        </Response>
      `;
    }
  }

  // Generate welcome response
  generateWelcomeResponse(language) {
    const messages = {
      en: 'Welcome to the Research Information System. Thank you for participating in our study.',
      sw: 'Karibu kwenye Mfumo wa Taarifa za Utafiti. Asante kwa kushiriki katika utafiti wetu.'
    };

    return `
      <Say voice="woman">${messages[language] || messages.en}</Say>
      <Pause length="1"/>
    `;
  }

  // Generate menu response
  generateMenuResponse(language) {
    const messages = {
      en: 'Press 1 to answer research questions, Press 2 to listen to research information, or Press 0 to end the call.',
      sw: 'Bonyeza 1 kujibu maswali ya utafiti, Bonyeza 2 kusikiliza taarifa za utafiti, au Bonyeza 0 kumaliza simu.'
    };

    return `
      <Say voice="woman">${messages[language] || messages.en}</Say>
      <GetDigits timeout="10" finishOnKey="#" callbackUrl="${process.env.BASE_URL}/voice/callback">
        <Say voice="woman">Please make your selection.</Say>
      </GetDigits>
      <Say voice="woman">We did not receive your selection. Goodbye.</Say>
      <Hangup/>
    `;
  }

  // Generate question response
  generateQuestionResponse(question, language, questionNumber, totalQuestions) {
    const prompts = {
      en: `Question ${questionNumber} of ${totalQuestions}. Please answer after the beep. You have up to 2 minutes to respond.`,
      sw: `Swali ${questionNumber} kati ya ${totalQuestions}. Tafadhali jibu baada ya mlio. Una dakika 2 kujibu.`
    };

    const speakPrompt = {
      en: 'Please speak after the beep.',
      sw: 'Tafadhali ongea baada ya mlio.'
    };

    return `
      <Say voice="woman">${prompts[language] || prompts.en}</Say>
      <Pause length="1"/>
      <Say voice="woman">${question.question_text}</Say>
      <Record timeout="120" trimSilence="true" playBeep="true" callbackUrl="${process.env.BASE_URL}/voice/callback">
        <Say voice="woman">${speakPrompt[language] || speakPrompt.en}</Say>
      </Record>
    `;
  }

  // Generate recording response
  generateRecordingResponse(language) {
    const messages = {
      en: 'Thank you for your response. Your answer has been recorded.',
      sw: 'Asante kwa jibu lako. Jibu lako limerekodiwa.'
    };

    return `
      <Say voice="woman">${messages[language] || messages.en}</Say>
      <Pause length="1"/>
      <Hangup/>
    `;
  }

  // Generate complete response
  generateCompleteResponse(language) {
    const messages = {
      en: 'Thank you for participating in our research. Your responses are valuable to us. Goodbye.',
      sw: 'Asante kwa kushiriki katika utafiti wetu. Majibu yako ni muhimu kwetu. Kwaheri.'
    };

    return `
      <Say voice="woman">${messages[language] || messages.en}</Say>
      <Hangup/>
    `;
  }

  // Generate default response
  generateDefaultResponse(language) {
    const messages = {
      en: 'Thank you for calling. Goodbye.',
      sw: 'Asante kwa kupiga simu. Kwaheri.'
    };

    return `
      <Say voice="woman">${messages[language] || messages.en}</Say>
      <Hangup/>
    `;
  }

  // Update call status
  async updateCallStatus(sessionId, status, eventData) {
    try {
      const call = await this.getCallBySessionId(sessionId);
      if (!call) {
        logger.warn('Call not found for status update:', { sessionId, status });
        return;
      }

      const updateData = {
        status,
        metadata: { ...call.metadata, ...eventData }
      };

      // Handle specific status updates
      switch (status) {
        case 'Completed':
        case 'Failed':
        case 'Busy':
        case 'NoAnswer':
          updateData.ended_at = new Date();
          if (eventData.durationInSeconds) {
            updateData.duration = parseInt(eventData.durationInSeconds);
          }
          // Clean up call state
          this.callStates.delete(sessionId);
          break;
      }

      await db.query(`
        UPDATE voice_calls 
        SET status = $1, metadata = $2, ended_at = COALESCE($3, ended_at), duration = COALESCE($4, duration)
        WHERE call_id = $5
      `, [
        updateData.status,
        JSON.stringify(updateData.metadata),
        updateData.ended_at,
        updateData.duration,
        call.call_id
      ]);

      logger.voice(call.phone_number, 'status_updated', {
        sessionId,
        status,
        duration: updateData.duration
      });

    } catch (error) {
      logger.error('Update call status error:', error);
    }
  }

  // Save recording
  async saveRecording(sessionId, recordingUrl, recordingData) {
    try {
      const call = await this.getCallBySessionId(sessionId);
      if (!call) {
        logger.warn('Call not found for recording save:', { sessionId });
        return;
      }

      // Get call state to find current question
      const callState = this.callStates.get(sessionId);
      const currentQuestion = callState?.questions?.[callState?.currentQuestionIndex];

      // Update call with recording URL
      await db.query(`
        UPDATE voice_calls 
        SET recording_url = $1, metadata = jsonb_set(metadata, '{recording_data}', $2)
        WHERE call_id = $3
      `, [recordingUrl, JSON.stringify(recordingData), call.call_id]);

      // Create research response record
      await db.query(`
        INSERT INTO research_responses (
          phone_number, question_id, response_type, audio_file_path, 
          voice_call_id, language, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        call.phone_number,
        currentQuestion?.id || null,
        'voice',
        recordingUrl,
        call.id,
        call.language,
        JSON.stringify({
          ...recordingData,
          questionText: currentQuestion?.question_text,
          questionNumber: (callState?.currentQuestionIndex || 0) + 1,
          totalQuestions: callState?.questions?.length || 0
        })
      ]);

      logger.voice(call.phone_number, 'recording_saved', {
        sessionId,
        recordingUrl,
        questionId: currentQuestion?.id,
        questionNumber: (callState?.currentQuestionIndex || 0) + 1
      });

    } catch (error) {
      logger.error('Save recording error:', error);
    }
  }

  // Get call by session ID
  async getCallBySessionId(sessionId) {
    try {
      const result = await db.query(`
        SELECT * FROM voice_calls 
        WHERE call_id = $1 OR metadata->>'at_session_id' = $1
        ORDER BY started_at DESC
        LIMIT 1
      `, [sessionId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Get call by session ID error:', error);
      return null;
    }
  }

  // Create call record
  async createCallRecord(sessionId, phoneNumber, direction) {
    try {
      const callId = uuidv4();
      
      const result = await db.query(`
        INSERT INTO voice_calls (call_id, phone_number, direction, status, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        callId,
        phoneNumber,
        direction,
        'active',
        JSON.stringify({ at_session_id: sessionId })
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Create call record error:', error);
      throw error;
    }
  }

  // Get active research questions for voice
  async getActiveQuestions(language = 'en') {
    try {
      const result = await db.query(`
        SELECT id, title, question_text, category
        FROM research_questions
        WHERE is_active = true AND language = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [language]);

      return result.rows;
    } catch (error) {
      logger.error('Get questions error:', error);
      return [];
    }
  }
}

module.exports = new VoiceService();