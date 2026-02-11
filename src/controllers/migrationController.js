const db = require('../database/connection');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class MigrationController {
  // Run approval system migration
  async runApprovalMigration(req, res) {
    try {
      logger.info('Starting approval system migration', { 
        userId: req.user.id,
        role: req.user.role 
      });

      // Read SQL file
      const sqlFile = path.join(__dirname, '../database/add-approval-system.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');

      // Execute the migration
      await db.query(sql);

      logger.info('Approval system migration completed successfully');

      // Verify the changes
      const verifications = [];

      // Check status column
      const statusCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
      `);
      verifications.push({
        check: 'status column in users',
        passed: statusCheck.rows.length > 0
      });

      // Check research_projects table
      const projectsCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'research_projects'
        )
      `);
      verifications.push({
        check: 'research_projects table',
        passed: projectsCheck.rows[0].exists
      });

      // Check approval columns
      const approvalCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('approval_date', 'approved_by', 'rejection_reason')
      `);
      verifications.push({
        check: 'approval columns in users',
        passed: approvalCheck.rows.length === 3
      });

      // Check project_id in questions
      const questionsProjectId = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'research_questions' AND column_name = 'project_id'
      `);
      verifications.push({
        check: 'project_id in research_questions',
        passed: questionsProjectId.rows.length > 0
      });

      // Check project_id in responses
      const responsesProjectId = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'research_responses' AND column_name = 'project_id'
      `);
      verifications.push({
        check: 'project_id in research_responses',
        passed: responsesProjectId.rows.length > 0
      });

      const allPassed = verifications.every(v => v.passed);

      res.json({
        success: true,
        message: 'Migration completed successfully',
        verifications,
        allChecksPass: allPassed
      });

    } catch (error) {
      logger.error('Migration error:', error);
      res.status(500).json({ 
        error: 'Migration failed',
        message: error.message,
        details: error.stack
      });
    }
  }

  // Fix user statuses - set all existing users to active
  async fixUserStatuses(req, res) {
    try {
      logger.info('Fixing user statuses', { 
        userId: req.user.id,
        role: req.user.role 
      });

      // Update all users to active status
      const result = await db.query(`
        UPDATE users 
        SET status = 'active' 
        WHERE status = 'pending' OR status IS NULL
        RETURNING id, username, role, status
      `);

      logger.info('User statuses fixed', { count: result.rows.length });

      res.json({
        success: true,
        message: `Updated ${result.rows.length} users to active status`,
        users: result.rows
      });

    } catch (error) {
      logger.error('Fix user statuses error:', error);
      res.status(500).json({ 
        error: 'Failed to fix user statuses',
        message: error.message
      });
    }
  }

  // Check migration status
  async checkMigrationStatus(req, res) {
    try {
      const checks = [];

      // Check status column
      const statusCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
      `);
      checks.push({
        name: 'status column',
        exists: statusCheck.rows.length > 0
      });

      // Check research_projects table
      const projectsCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'research_projects'
        )
      `);
      checks.push({
        name: 'research_projects table',
        exists: projectsCheck.rows[0].exists
      });

      // Check approval columns
      const approvalColumns = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('approval_date', 'approved_by', 'rejection_reason')
      `);
      checks.push({
        name: 'approval_date column',
        exists: approvalColumns.rows.some(r => r.column_name === 'approval_date')
      });
      checks.push({
        name: 'approved_by column',
        exists: approvalColumns.rows.some(r => r.column_name === 'approved_by')
      });
      checks.push({
        name: 'rejection_reason column',
        exists: approvalColumns.rows.some(r => r.column_name === 'rejection_reason')
      });

      // Check project_id columns
      const projectIdQuestions = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'research_questions' AND column_name = 'project_id'
      `);
      checks.push({
        name: 'project_id in research_questions',
        exists: projectIdQuestions.rows.length > 0
      });

      const projectIdResponses = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'research_responses' AND column_name = 'project_id'
      `);
      checks.push({
        name: 'project_id in research_responses',
        exists: projectIdResponses.rows.length > 0
      });

      const migrationApplied = checks.every(c => c.exists);

      res.json({
        success: true,
        migrationApplied,
        checks
      });

    } catch (error) {
      logger.error('Check migration status error:', error);
      res.status(500).json({ 
        error: 'Failed to check migration status',
        message: error.message
      });
    }
  }
}

module.exports = new MigrationController();
