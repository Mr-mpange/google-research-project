const db = require('../database/connection');
const logger = require('../utils/logger');
const voiceService = require('./voiceService');
const smsService = require('./smsService');

class USSDService {
  constructor() {
    this.menus = {
      main: {
        title: 'Research Information System',
        options: [
          '1. Research Information',
          '2. Answer Research Questions', 
          '3. Record Voice Response',
          '4. Listen to Research Summary',
          '5. Change Language / Badili Lugha',
          '0. Exit'
        ]
      },
      info: {
        title: 'Research Information',
        options: [
          '1. About This Research',
          '2. How to Participate',
          '3. Privacy & Data Use',
          '4. Contact Information',
          '0. Back to Main Menu'
        ]
      },
      questions: {
        title: 'Research Questions',
        options: [] // Dynamically populated
      },
      language: {
        title: 'Select Language / Chagua Lugha',
        options: [
          '1. English',
          '2. Kiswahili',
          '0. Back / Rudi'
        ]
      }
    };
  }

  // Get existing session
  async getSession(sessionId) {
    try {
      const result = await db.query(
        'SELECT * FROM ussd_sessions WHERE session_id = $1',
        [sessionId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Get session error:', error);
      return null;
    }
  }

  // Create new session
  async createSession(sessionId, phoneNumber, serviceCode) {
    try {
      const result = await db.query(`
        INSERT INTO ussd_sessions (session_id, phone_number, service_code, current_menu, menu_data)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [sessionId, phoneNumber, serviceCode, 'main', JSON.stringify({ language: 'en' })]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Create session error:', error);
      throw error;
    }
  }

  // Update session activity
  async updateSessionActivity(sessionId) {
    try {
      await db.query(`
        UPDATE ussd_sessions 
        SET total_interactions = total_interactions + 1
        WHERE session_id = $1
      `, [sessionId]);
    } catch (error) {
      logger.error('Update session activity error:', error);
    }
  }

  // End session
  async endSession(sessionId) {
    try {
      await db.query(`
        UPDATE ussd_sessions 
        SET is_active = false, ended_at = CURRENT_TIMESTAMP
        WHERE session_id = $1
      `, [sessionId]);
    } catch (error) {
      logger.error('End session error:', error);
    }
  }

  // Process USSD input
  async processInput(session, input) {
    try {
      const menuData = session.menu_data || { language: 'en' };
      const currentMenu = session.current_menu;
      const language = menuData.language || 'en';

      logger.ussd(session.phone_number, 'processing_input', {
        sessionId: session.session_id,
        currentMenu,
        input,
        language
      });

      // Handle input based on current menu
      switch (currentMenu) {
        case 'main':
        case null:
        case undefined:
        case '':
          return await this.handleMainMenu(session, input, language);
        
        case 'info':
          return await this.handleInfoMenu(session, input, language);
        
        case 'questions':
          return await this.handleQuestionsMenu(session, input, language);
        
        case 'question_answer':
          return await this.handleQuestionAnswer(session, input, language);
        
        case 'language':
          return await this.handleLanguageMenu(session, input);
        
        default:
          // If unknown menu, go to main menu with original input
          return await this.handleMainMenu(session, input, language);
      }

    } catch (error) {
      logger.error('Process input error:', error);
      return {
        type: 'END',
        message: this.getText('error_message', session.menu_data?.language || 'en')
      };
    }
  }

  // Handle main menu
  async handleMainMenu(session, input, language) {
    switch (input) {
      case '': // Initial request - show main menu
      case undefined:
      case null:
        return {
          type: 'CON',
          message: this.buildMenu('main', language),
          menuLevel: 'main'
        };

      case '1': // Research Information
        await this.updateSessionMenu(session.session_id, 'info');
        return {
          type: 'CON',
          message: this.buildMenu('info', language),
          menuLevel: 'info'
        };

      case '2': // Answer Research Questions
        const questions = await this.getActiveQuestions(language);
        if (questions.length === 0) {
          return {
            type: 'END',
            message: this.getText('no_questions', language)
          };
        }
        
        await this.updateSessionMenu(session.session_id, 'questions', { questions });
        return {
          type: 'CON',
          message: this.buildQuestionsMenu(questions, language),
          menuLevel: 'questions'
        };

      case '3': // Record Voice Response
        try {
          await voiceService.initiateCall(session.phone_number, language);
          return {
            type: 'END',
            message: this.getText('voice_call_initiated', language)
          };
        } catch (error) {
          logger.error('Voice call initiation error:', error);
          return {
            type: 'END',
            message: this.getText('voice_call_error', language)
          };
        }

      case '4': // Listen to Research Summary
        return {
          type: 'END',
          message: this.getText('summary_feature_coming', language)
        };

      case '5': // Change Language
        await this.updateSessionMenu(session.session_id, 'language');
        return {
          type: 'CON',
          message: this.buildMenu('language', 'both'),
          menuLevel: 'language'
        };

      case '0': // Exit
        return {
          type: 'END',
          message: this.getText('goodbye', language)
        };

      default:
        return {
          type: 'CON',
          message: this.getText('invalid_option', language) + '\n\n' + this.buildMenu('main', language),
          menuLevel: 'main'
        };
    }
  }

  // Handle info menu
  async handleInfoMenu(session, input, language) {
    // Extract the last input (after the last *)
    const parts = input.split('*');
    const lastInput = parts[parts.length - 1];
    
    switch (lastInput) {
      case '1': // About This Research
        return {
          type: 'END',
          message: this.getText('about_research', language)
        };

      case '2': // How to Participate
        return {
          type: 'END',
          message: this.getText('how_to_participate', language)
        };

      case '3': // Privacy & Data Use
        return {
          type: 'END',
          message: this.getText('privacy_info', language)
        };

      case '4': // Contact Information
        return {
          type: 'END',
          message: this.getText('contact_info', language)
        };

      case '0': // Back to Main Menu
        await this.updateSessionMenu(session.session_id, 'main');
        return {
          type: 'CON',
          message: this.buildMenu('main', language),
          menuLevel: 'main'
        };

      default:
        return {
          type: 'CON',
          message: this.getText('invalid_option', language) + '\n\n' + this.buildMenu('info', language),
          menuLevel: 'info'
        };
    }
  }
        return {
          type: 'END',
          message: this.getText('contact_info', language)
        };

      case '0': // Back to Main Menu
        await this.updateSessionMenu(session.session_id, 'main');
        return {
          type: 'CON',
          message: this.buildMenu('main', language),
          menuLevel: 'main'
        };

      default:
        return {
          type: 'CON',
          message: this.getText('invalid_option', language) + '\n\n' + this.buildMenu('info', language),
          menuLevel: 'info'
        };
    }
  }

  // Handle questions menu
  async handleQuestionsMenu(session, input, language) {
    const menuData = session.menu_data || {};
    const questions = menuData.questions || [];
    
    // Extract the last input (after the last *)
    const parts = input.split('*');
    const lastInput = parts[parts.length - 1];

    if (lastInput === '0') {
      await this.updateSessionMenu(session.session_id, 'main');
      return {
        type: 'CON',
        message: this.buildMenu('main', language),
        menuLevel: 'main'
      };
    }

    const questionIndex = parseInt(lastInput) - 1;
    if (questionIndex >= 0 && questionIndex < questions.length) {
      const selectedQuestion = questions[questionIndex];
      await this.updateSessionMenu(session.session_id, 'question_answer', {
        ...menuData,
        selectedQuestion
      });

      return {
        type: 'CON',
        message: `${selectedQuestion.question_text}\n\n${this.getText('type_answer', language)}`,
        menuLevel: 'question_answer'
      };
    }

    return {
      type: 'CON',
      message: this.getText('invalid_option', language) + '\n\n' + this.buildQuestionsMenu(questions, language),
      menuLevel: 'questions'
    };
  }

  // Handle question answer
  async handleQuestionAnswer(session, input, language) {
    try {
      const menuData = session.menu_data || {};
      const selectedQuestion = menuData.selectedQuestion;

      if (!selectedQuestion) {
        await this.updateSessionMenu(session.session_id, 'main');
        return {
          type: 'CON',
          message: this.buildMenu('main', language),
          menuLevel: 'main'
        };
      }

      // Save the response
      await db.query(`
        INSERT INTO research_responses (
          phone_number, question_id, response_type, response_text, 
          ussd_session_id, language
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        session.phone_number,
        selectedQuestion.id,
        'ussd',
        input,
        session.id,
        language
      ]);

      logger.ussd(session.phone_number, 'response_saved', {
        questionId: selectedQuestion.id,
        responseLength: input.length
      });

      // Send thank you SMS asynchronously (don't wait for it)
      this.sendThankYouSMS(session.phone_number, language, selectedQuestion)
        .catch(error => {
          logger.error('Failed to send thank you SMS', {
            phoneNumber: session.phone_number,
            error: error.message
          });
        });

      return {
        type: 'END',
        message: this.getText('response_saved_with_sms', language)
      };

    } catch (error) {
      logger.error('Save response error:', error);
      return {
        type: 'END',
        message: this.getText('response_save_error', language)
      };
    }
  }

  // Send thank you SMS (async helper)
  async sendThankYouSMS(phoneNumber, language, questionDetails) {
    try {
      // Clean phone number format (remove URL encoding if present)
      const cleanPhoneNumber = decodeURIComponent(phoneNumber);
      
      logger.info('Preparing to send thank you SMS', {
        originalPhone: phoneNumber,
        cleanPhone: cleanPhoneNumber,
        language,
        questionTitle: questionDetails.title
      });

      await smsService.sendThankYouSMS(cleanPhoneNumber, language, {
        questionTitle: questionDetails.title,
        questionText: questionDetails.question_text
      });
      
      logger.info('Thank you SMS sent successfully', {
        phoneNumber: cleanPhoneNumber,
        questionTitle: questionDetails.title
      });
    } catch (error) {
      logger.error('Thank you SMS failed', {
        phoneNumber,
        error: error.message,
        stack: error.stack
      });
    }
  }

  // Handle language menu
  async handleLanguageMenu(session, input) {
    // Extract the last input (after the last *)
    const parts = input.split('*');
    const lastInput = parts[parts.length - 1];
    
    switch (lastInput) {
      case '1': // English
        await this.updateSessionMenu(session.session_id, 'main', { language: 'en' });
        return {
          type: 'CON',
          message: this.buildMenu('main', 'en'),
          menuLevel: 'main'
        };

      case '2': // Kiswahili
        await this.updateSessionMenu(session.session_id, 'main', { language: 'sw' });
        return {
          type: 'CON',
          message: this.buildMenu('main', 'sw'),
          menuLevel: 'main'
        };

      case '0': // Back
        const currentLang = session.menu_data?.language || 'en';
        await this.updateSessionMenu(session.session_id, 'main');
        return {
          type: 'CON',
          message: this.buildMenu('main', currentLang),
          menuLevel: 'main'
        };

      default:
        return {
          type: 'CON',
          message: 'Invalid option / Chaguo batili\n\n' + this.buildMenu('language', 'both'),
          menuLevel: 'language'
        };
    }
  }

  // Update session menu and data
  async updateSessionMenu(sessionId, menu, additionalData = {}) {
    try {
      const currentSession = await this.getSession(sessionId);
      const currentData = currentSession?.menu_data || {};
      const newData = { ...currentData, ...additionalData };

      await db.query(`
        UPDATE ussd_sessions 
        SET current_menu = $1, menu_data = $2
        WHERE session_id = $3
      `, [menu, JSON.stringify(newData), sessionId]);
    } catch (error) {
      logger.error('Update session menu error:', error);
    }
  }

  // Get active research questions
  async getActiveQuestions(language = 'en') {
    try {
      const result = await db.query(`
        SELECT id, title, question_text, category
        FROM research_questions
        WHERE is_active = true AND language = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [language]);

      return result.rows;
    } catch (error) {
      logger.error('Get questions error:', error);
      return [];
    }
  }

  // Build menu display
  buildMenu(menuType, language) {
    const texts = this.getMenuTexts(language);
    
    switch (menuType) {
      case 'main':
        return `${texts.main.title}\n\n${texts.main.options.join('\n')}`;
      
      case 'info':
        return `${texts.info.title}\n\n${texts.info.options.join('\n')}`;
      
      case 'language':
        return `Select Language / Chagua Lugha\n\n1. English\n2. Kiswahili\n0. Back / Rudi`;
      
      default:
        return texts.main.title + '\n\n' + texts.main.options.join('\n');
    }
  }

  // Build questions menu
  buildQuestionsMenu(questions, language) {
    const title = this.getText('select_question', language);
    let menu = `${title}\n\n`;
    
    questions.forEach((question, index) => {
      menu += `${index + 1}. ${question.title}\n`;
    });
    
    menu += `0. ${this.getText('back_to_main', language)}`;
    return menu;
  }

  // Get localized text
  getText(key, language = 'en') {
    const texts = {
      en: {
        error_message: 'Sorry, there was an error. Please try again later.',
        no_questions: 'No research questions available at the moment.',
        voice_call_initiated: 'You will receive a call shortly for voice recording.',
        voice_call_error: 'Unable to initiate voice call. Please try again later.',
        summary_feature_coming: 'Research summary feature coming soon!',
        goodbye: 'Thank you for participating in our research!',
        invalid_option: 'Invalid option. Please try again.',
        about_research: 'This research aims to understand community needs and experiences. Your participation helps improve services.',
        how_to_participate: 'You can participate by answering questions via USSD or voice calls. All responses are confidential.',
        privacy_info: 'Your data is kept confidential and used only for research purposes. You can withdraw at any time.',
        contact_info: 'For questions, contact: research@example.com or call +254700000000',
        select_question: 'Select a question to answer:',
        back_to_main: 'Back to Main Menu',
        type_answer: 'Please type your answer:',
        response_saved: 'Thank you! Your response has been saved.',
        response_saved_with_sms: 'Thank you! Your response has been saved. You will receive a confirmation SMS shortly.',
        response_save_error: 'Error saving response. Please try again.'
      },
      sw: {
        error_message: 'Samahani, kumekuwa na hitilafu. Tafadhali jaribu tena baadaye.',
        no_questions: 'Hakuna maswali ya utafiti kwa sasa.',
        voice_call_initiated: 'Utapokea simu hivi karibuni kwa ajili ya kurekodi sauti.',
        voice_call_error: 'Haiwezi kuanzisha simu. Tafadhali jaribu tena baadaye.',
        summary_feature_coming: 'Kipengele cha muhtasari wa utafiti kinakuja hivi karibuni!',
        goodbye: 'Asante kwa kushiriki katika utafiti wetu!',
        invalid_option: 'Chaguo batili. Tafadhali jaribu tena.',
        about_research: 'Utafiti huu unalenga kuelewa mahitaji na uzoefu wa jamii. Ushiriki wako unasaidia kuboresha huduma.',
        how_to_participate: 'Unaweza kushiriki kwa kujibu maswali kupitia USSD au simu za sauti. Majibu yote ni ya siri.',
        privacy_info: 'Data yako inawekwa kwa siri na inatumiwa tu kwa madhumuni ya utafiti. Unaweza kujiondoa wakati wowote.',
        contact_info: 'Kwa maswali, wasiliana: research@example.com au piga simu +254700000000',
        select_question: 'Chagua swali la kujibu:',
        back_to_main: 'Rudi kwenye Menyu Kuu',
        type_answer: 'Tafadhali andika jibu lako:',
        response_saved: 'Asante! Jibu lako limehifadhiwa.',
        response_saved_with_sms: 'Asante! Jibu lako limehifadhiwa. Utapokea ujumbe wa uthibitisho hivi karibuni.',
        response_save_error: 'Hitilafu katika kuhifadhi jibu. Tafadhali jaribu tena.'
      }
    };

    return texts[language]?.[key] || texts.en[key] || key;
  }

  // Get menu texts based on language
  getMenuTexts(language = 'en') {
    const texts = {
      en: {
        main: {
          title: 'Research Information System',
          options: [
            '1. Research Information',
            '2. Answer Research Questions',
            '3. Record Voice Response',
            '4. Listen to Research Summary',
            '5. Change Language',
            '0. Exit'
          ]
        },
        info: {
          title: 'Research Information',
          options: [
            '1. About This Research',
            '2. How to Participate',
            '3. Privacy & Data Use',
            '4. Contact Information',
            '0. Back to Main Menu'
          ]
        }
      },
      sw: {
        main: {
          title: 'Mfumo wa Taarifa za Utafiti',
          options: [
            '1. Taarifa za Utafiti',
            '2. Jibu Maswali ya Utafiti',
            '3. Rekodi Jibu la Sauti',
            '4. Sikiliza Muhtasari wa Utafiti',
            '5. Badili Lugha',
            '0. Toka'
          ]
        },
        info: {
          title: 'Taarifa za Utafiti',
          options: [
            '1. Kuhusu Utafiti Huu',
            '2. Jinsi ya Kushiriki',
            '3. Faragha na Matumizi ya Data',
            '4. Taarifa za Mawasiliano',
            '0. Rudi kwenye Menyu Kuu'
          ]
        }
      }
    };

    return texts[language] || texts.en;
  }
}

module.exports = new USSDService();