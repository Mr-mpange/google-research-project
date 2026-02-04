const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('../database/connection');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    // Initialize OpenAI (for fallback/legacy support)
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    // Initialize Gemini AI
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.geminiModel = this.genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' 
      });
      this.geminiVisionModel = this.genAI.getGenerativeModel({ 
        model: process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash' 
      });
    }
    
    this.confidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.7;
    this.summaryMaxLength = parseInt(process.env.SUMMARY_MAX_LENGTH) || 500;
    this.preferredAI = process.env.PREFERRED_AI_SERVICE || 'gemini'; // 'gemini' or 'openai'
  }

  // Process voice recording with AI
  async processVoiceRecording(sessionId, recordingUrl, phoneNumber) {
    try {
      logger.ai('processing_voice_recording', {
        sessionId,
        phoneNumber,
        recordingUrl
      });

      // Download and save audio file
      const audioFilePath = await this.downloadAudioFile(recordingUrl, sessionId);
      
      // Transcribe audio to text
      const transcription = await this.transcribeAudio(audioFilePath);
      
      // Get response record
      const response = await this.getResponseByCallSession(sessionId);
      if (!response) {
        throw new Error('Response record not found');
      }

      // Save transcription
      const transcriptionRecord = await this.saveTranscription(
        response.id,
        audioFilePath,
        transcription
      );

      // Generate AI summary
      const summary = await this.generateSummary(transcription.text, response);
      
      // Save summary
      await this.saveSummary(response.id, transcriptionRecord.id, summary);

      logger.ai('voice_processing_complete', {
        sessionId,
        phoneNumber,
        transcriptionLength: transcription.text.length,
        summaryLength: summary.text.length
      });

      return {
        transcription: transcriptionRecord,
        summary
      };

    } catch (error) {
      logger.error('AI voice processing error:', error);
      throw error;
    }
  }

  // Download audio file from URL
  async downloadAudioFile(url, sessionId) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../uploads/audio');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `${sessionId}_${Date.now()}.wav`;
      const filePath = path.join(uploadsDir, fileName);

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });

    } catch (error) {
      logger.error('Download audio file error:', error);
      throw error;
    }
  }

  // Transcribe audio using OpenAI Whisper
  async transcribeAudio(audioFilePath) {
    try {
      const startTime = Date.now();
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
        language: 'en', // Can be made dynamic based on user preference
        response_format: 'verbose_json'
      });

      const processingDuration = Date.now() - startTime;

      logger.ai('transcription_complete', {
        audioFile: path.basename(audioFilePath),
        textLength: transcription.text.length,
        processingDuration,
        confidence: transcription.segments?.[0]?.avg_logprob
      });

      return {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        confidence: transcription.segments?.[0]?.avg_logprob,
        processingDuration
      };

    } catch (error) {
      logger.error('Audio transcription error:', error);
      throw error;
    }
  }

  // Generate AI summary of transcribed text using Gemini or OpenAI
  async generateSummary(text, responseContext = {}) {
    try {
      const startTime = Date.now();

      let summaryText;
      let processingDuration;

      if (this.preferredAI === 'gemini' && this.geminiModel) {
        summaryText = await this.generateGeminiSummary(text, responseContext);
      } else if (this.openai) {
        summaryText = await this.generateOpenAISummary(text, responseContext);
      } else {
        throw new Error('No AI service available. Please configure GEMINI_API_KEY or OPENAI_API_KEY');
      }

      processingDuration = Date.now() - startTime;

      // Extract key points and themes using simple NLP
      const keyPoints = this.extractKeyPoints(text);
      const themes = this.extractThemes(text);
      const sentiment = this.analyzeSentiment(text);

      logger.ai('summary_generated', {
        service: this.preferredAI,
        originalLength: text.length,
        summaryLength: summaryText.length,
        keyPointsCount: keyPoints.length,
        themesCount: themes.length,
        sentiment,
        processingDuration
      });

      return {
        text: summaryText,
        keyPoints,
        themes,
        sentiment,
        confidence: 0.85, // Placeholder - could be calculated based on model confidence
        wordCount: summaryText.split(' ').length,
        processingDuration,
        service: this.preferredAI
      };

    } catch (error) {
      logger.error('AI summary generation error:', error);
      throw error;
    }
  }

  // Generate summary using Gemini AI
  async generateGeminiSummary(text, responseContext = {}) {
    try {
      const prompt = this.buildSummaryPrompt(text, responseContext);
      
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      
      return response.text();

    } catch (error) {
      logger.error('Gemini summary generation error:', error);
      // Fallback to OpenAI if available
      if (this.openai) {
        logger.info('Falling back to OpenAI for summary generation');
        return await this.generateOpenAISummary(text, responseContext);
      }
      throw error;
    }
  }

  // Generate summary using OpenAI
  async generateOpenAISummary(text, responseContext = {}) {
    try {
      const prompt = this.buildSummaryPrompt(text, responseContext);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert research analyst specializing in qualitative data analysis. Provide concise, insightful summaries of research responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: Math.floor(this.summaryMaxLength / 2), // Rough token estimation
        temperature: 0.3
      });

      return completion.choices[0].message.content;

    } catch (error) {
      logger.error('OpenAI summary generation error:', error);
      throw error;
    }
  }

  // Build summary prompt
  buildSummaryPrompt(text, context) {
    let prompt = `Please analyze and summarize the following research response:\n\n"${text}"\n\n`;
    
    if (context.question_text) {
      prompt += `This response was given to the question: "${context.question_text}"\n\n`;
    }

    prompt += `Please provide:
1. A concise summary (max ${this.summaryMaxLength} characters)
2. Key insights or themes
3. Notable quotes or statements
4. Overall sentiment (positive/neutral/negative)

Focus on extracting meaningful insights that would be valuable for research analysis.`;

    return prompt;
  }

  // Extract key points using simple keyword analysis
  extractKeyPoints(text) {
    try {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const keyPoints = [];

      // Simple scoring based on sentence length and keyword presence
      const importantWords = [
        'important', 'significant', 'main', 'key', 'primary', 'major',
        'problem', 'issue', 'challenge', 'solution', 'benefit', 'advantage',
        'need', 'require', 'essential', 'critical', 'urgent'
      ];

      sentences.forEach(sentence => {
        let score = 0;
        const words = sentence.toLowerCase().split(/\s+/);
        
        // Score based on important words
        words.forEach(word => {
          if (importantWords.includes(word)) {
            score += 2;
          }
        });

        // Prefer sentences of moderate length
        if (words.length >= 5 && words.length <= 20) {
          score += 1;
        }

        if (score >= 2) {
          keyPoints.push({
            text: sentence.trim(),
            score
          });
        }
      });

      return keyPoints
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(point => point.text);

    } catch (error) {
      logger.error('Extract key points error:', error);
      return [];
    }
  }

  // Extract themes using keyword clustering
  extractThemes(text) {
    try {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);

      // Define theme categories
      const themeCategories = {
        healthcare: ['health', 'medical', 'doctor', 'hospital', 'treatment', 'medicine', 'clinic'],
        education: ['school', 'education', 'learning', 'teacher', 'student', 'study', 'knowledge'],
        economic: ['money', 'income', 'job', 'work', 'business', 'economic', 'financial'],
        social: ['community', 'family', 'social', 'people', 'society', 'relationship'],
        infrastructure: ['road', 'water', 'electricity', 'transport', 'infrastructure', 'facility'],
        technology: ['technology', 'internet', 'mobile', 'digital', 'computer', 'online']
      };

      const themes = [];
      
      Object.entries(themeCategories).forEach(([theme, keywords]) => {
        const matches = words.filter(word => 
          keywords.some(keyword => word.includes(keyword) || keyword.includes(word))
        );
        
        if (matches.length > 0) {
          themes.push({
            name: theme,
            relevance: matches.length / words.length,
            keywords: [...new Set(matches)]
          });
        }
      });

      return themes
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3);

    } catch (error) {
      logger.error('Extract themes error:', error);
      return [];
    }
  }

  // Simple sentiment analysis
  analyzeSentiment(text) {
    try {
      const positiveWords = [
        'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
        'happy', 'satisfied', 'pleased', 'love', 'like', 'enjoy',
        'helpful', 'useful', 'beneficial', 'positive', 'success'
      ];

      const negativeWords = [
        'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'frustrated',
        'angry', 'sad', 'unhappy', 'hate', 'dislike', 'problem',
        'issue', 'difficult', 'challenging', 'negative', 'failure'
      ];

      const words = text.toLowerCase().split(/\s+/);
      
      let positiveScore = 0;
      let negativeScore = 0;

      words.forEach(word => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
      });

      if (positiveScore > negativeScore) return 'positive';
      if (negativeScore > positiveScore) return 'negative';
      return 'neutral';

    } catch (error) {
      logger.error('Sentiment analysis error:', error);
      return 'neutral';
    }
  }

  // Save transcription to database
  async saveTranscription(responseId, audioFilePath, transcription) {
    try {
      const result = await db.query(`
        INSERT INTO transcriptions (
          response_id, original_audio_path, transcribed_text, 
          confidence_score, language_detected, processing_duration, 
          service_used, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        responseId,
        audioFilePath,
        transcription.text,
        transcription.confidence,
        transcription.language,
        transcription.processingDuration,
        'openai',
        JSON.stringify({
          duration: transcription.duration,
          model: 'whisper-1'
        })
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Save transcription error:', error);
      throw error;
    }
  }

  // Save AI summary to database
  async saveSummary(responseId, transcriptionId, summary) {
    try {
      const result = await db.query(`
        INSERT INTO ai_summaries (
          response_id, transcription_id, summary_text, key_points,
          themes, sentiment, confidence_score, word_count,
          processing_model, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        responseId,
        transcriptionId,
        summary.text,
        JSON.stringify(summary.keyPoints),
        JSON.stringify(summary.themes),
        summary.sentiment,
        summary.confidence,
        summary.wordCount,
        process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        JSON.stringify({
          processingDuration: summary.processingDuration
        })
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Save summary error:', error);
      throw error;
    }
  }

  // Get response by call session
  async getResponseByCallSession(sessionId) {
    try {
      const result = await db.query(`
        SELECT r.*, q.question_text
        FROM research_responses r
        LEFT JOIN research_questions q ON r.question_id = q.id
        JOIN voice_calls v ON r.voice_call_id = v.id
        WHERE v.call_id = $1 OR v.metadata->>'at_session_id' = $1
        ORDER BY r.created_at DESC
        LIMIT 1
      `, [sessionId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Get response by call session error:', error);
      return null;
    }
  }

  // Batch process multiple recordings
  async batchProcessRecordings(limit = 10) {
    try {
      // Get unprocessed voice responses
      const result = await db.query(`
        SELECT r.*, v.call_id, v.phone_number
        FROM research_responses r
        JOIN voice_calls v ON r.voice_call_id = v.id
        LEFT JOIN transcriptions t ON r.id = t.response_id
        WHERE r.response_type = 'voice' 
          AND r.audio_file_path IS NOT NULL 
          AND t.id IS NULL
        ORDER BY r.created_at ASC
        LIMIT $1
      `, [limit]);

      const unprocessedResponses = result.rows;
      
      logger.ai('batch_processing_started', {
        count: unprocessedResponses.length
      });

      for (const response of unprocessedResponses) {
        try {
          await this.processVoiceRecording(
            response.call_id,
            response.audio_file_path,
            response.phone_number
          );
        } catch (error) {
          logger.error('Batch processing item error:', {
            responseId: response.id,
            error: error.message
          });
        }
      }

      logger.ai('batch_processing_complete', {
        processed: unprocessedResponses.length
      });

      return unprocessedResponses.length;

    } catch (error) {
      logger.error('Batch processing error:', error);
      throw error;
    }
  }

  // Generate insights using Gemini AI
  async generateInsights(texts, context = {}) {
    try {
      if (!this.geminiModel) {
        throw new Error('Gemini AI not configured');
      }

      const prompt = `
        Analyze the following research responses and provide comprehensive insights:

        ${texts.map((text, index) => `Response ${index + 1}: "${text}"`).join('\n\n')}

        Context: ${JSON.stringify(context)}

        Please provide:
        1. Common themes and patterns
        2. Key insights and findings
        3. Sentiment analysis across responses
        4. Recommendations based on the data
        5. Areas that need further investigation

        Format your response as structured JSON with the following keys:
        - themes: array of theme objects with name and frequency
        - insights: array of key insight strings
        - sentiment: overall sentiment analysis
        - recommendations: array of recommendation strings
        - further_investigation: array of areas needing more research
      `;

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      
      try {
        return JSON.parse(response.text());
      } catch (parseError) {
        // If JSON parsing fails, return structured text
        return {
          raw_analysis: response.text(),
          error: 'Failed to parse structured response'
        };
      }

    } catch (error) {
      logger.error('Gemini insights generation error:', error);
      throw error;
    }
  }

  // Analyze text with Gemini for specific research questions
  async analyzeWithGemini(text, analysisType = 'general') {
    try {
      if (!this.geminiModel) {
        throw new Error('Gemini AI not configured');
      }

      let prompt;
      
      switch (analysisType) {
        case 'sentiment':
          prompt = `Analyze the sentiment of this text and provide a detailed breakdown: "${text}"`;
          break;
        case 'themes':
          prompt = `Extract and categorize the main themes from this text: "${text}"`;
          break;
        case 'keywords':
          prompt = `Extract the most important keywords and phrases from this text: "${text}"`;
          break;
        case 'summary':
          prompt = `Provide a concise summary of this text: "${text}"`;
          break;
        default:
          prompt = `Provide a comprehensive analysis of this text including themes, sentiment, and key insights: "${text}"`;
      }

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      
      return {
        analysis: response.text(),
        type: analysisType,
        service: 'gemini'
      };

    } catch (error) {
      logger.error('Gemini analysis error:', error);
      throw error;
    }
  }

  // Process image with Gemini Vision (for future use with image-based research)
  async processImageWithGemini(imagePath, prompt = 'Describe this image in detail') {
    try {
      if (!this.geminiVisionModel) {
        throw new Error('Gemini Vision model not configured');
      }

      // Read image file
      const imageData = fs.readFileSync(imagePath);
      const imageBase64 = imageData.toString('base64');
      
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: this.getMimeType(imagePath)
        }
      };

      const result = await this.geminiVisionModel.generateContent([prompt, imagePart]);
      const response = await result.response;
      
      return {
        description: response.text(),
        service: 'gemini-vision'
      };

    } catch (error) {
      logger.error('Gemini vision processing error:', error);
      throw error;
    }
  }

  // Helper method to get MIME type from file extension
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  // Get AI service status
  getServiceStatus() {
    return {
      gemini: {
        available: !!this.geminiModel,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        vision_model: process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash'
      },
      openai: {
        available: !!this.openai,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
      },
      preferred: this.preferredAI,
      speech_to_text: process.env.STT_SERVICE || 'google'
    };
  }
}

module.exports = new AIService();