const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const logger = require('../utils/logger');

class PublicController {
  // Contact form submission
  async submitContactForm(req, res) {
    try {
      await body('name').notEmpty().withMessage('Name is required').run(req);
      await body('email').isEmail().withMessage('Valid email is required').run(req);
      await body('message').notEmpty().withMessage('Message is required').run(req);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { name, email, organization, message } = req.body;

      // Store contact form submission in database
      await db.query(`
        INSERT INTO contact_submissions (name, email, organization, message, submitted_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [name, email, organization || null, message]);

      logger.info('Contact form submitted', { email, name });

      // TODO: Send email notification to admin
      // For now, just log and return success

      res.json({
        success: true,
        message: 'Thank you for your message. We will get back to you soon.'
      });

    } catch (error) {
      logger.error('Contact form submission error:', error);
      res.status(500).json({ error: 'Failed to submit contact form' });
    }
  }

  // Newsletter subscription
  async subscribeNewsletter(req, res) {
    try {
      await body('email').isEmail().withMessage('Valid email is required').run(req);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { email } = req.body;

      // Check if already subscribed
      const existing = await db.query(
        'SELECT id FROM newsletter_subscribers WHERE email = $1',
        [email]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Email already subscribed',
          message: 'This email is already subscribed to our newsletter.'
        });
      }

      // Add to newsletter subscribers
      await db.query(`
        INSERT INTO newsletter_subscribers (email, subscribed_at, is_active)
        VALUES ($1, NOW(), true)
      `, [email]);

      logger.info('Newsletter subscription', { email });

      res.json({
        success: true,
        message: 'Successfully subscribed to newsletter'
      });

    } catch (error) {
      logger.error('Newsletter subscription error:', error);
      res.status(500).json({ error: 'Failed to subscribe to newsletter' });
    }
  }

  // Get whitepaper download URL
  async getWhitepaper(req, res) {
    try {
      const { filename } = req.params;

      // For now, return 404 as whitepapers are not yet uploaded
      // In production, you would check if file exists and return download URL
      
      logger.info('Whitepaper download requested', { filename });

      // TODO: Implement file storage and retrieval
      // For now, return not found
      res.status(404).json({
        error: 'Whitepaper not found',
        message: 'This whitepaper will be available soon. Contact us for early access.'
      });

    } catch (error) {
      logger.error('Whitepaper download error:', error);
      res.status(500).json({ error: 'Failed to retrieve whitepaper' });
    }
  }

  // Update user profile
  async updateUserProfile(req, res) {
    try {
      const { userId } = req.params;
      
      // Verify user is updating their own profile or is admin
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to update this profile' });
      }

      await body('full_name')
        .optional()
        .isLength({ min: 1, max: 255 })
        .withMessage('Full name must be 1-255 characters')
        .run(req);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { full_name } = req.body;

      // Update user profile
      const result = await db.query(`
        UPDATE users 
        SET full_name = COALESCE($1, full_name),
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, username, email, full_name, role, is_active, created_at, updated_at
      `, [full_name, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info('User profile updated', { userId, updatedBy: req.user.id });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: result.rows[0]
      });

    } catch (error) {
      logger.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  // Run database migration (admin only)
  async runMigration(req, res) {
    try {
      logger.info('Running public tables migration...');

      const sql = `
        CREATE TABLE IF NOT EXISTS contact_submissions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            organization VARCHAR(255),
            message TEXT NOT NULL,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) UNIQUE NOT NULL,
            subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            unsubscribed_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT true
        );

        CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
        CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
        CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted ON contact_submissions(submitted_at);
        CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
        CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active ON newsletter_subscribers(is_active) WHERE is_active = true;
      `;

      await db.query(sql);

      // Verify tables were created
      const result = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('contact_submissions', 'newsletter_subscribers')
        ORDER BY table_name
      `);

      logger.info('Migration completed', { tables: result.rows });

      res.json({
        success: true,
        message: 'Database migration completed successfully',
        tables: result.rows.map(r => r.table_name)
      });

    } catch (error) {
      logger.error('Migration error:', error);
      res.status(500).json({ 
        error: 'Migration failed',
        details: error.message 
      });
    }
  }
}

module.exports = new PublicController();
