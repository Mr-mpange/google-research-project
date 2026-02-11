/**
 * Check Database Schema
 * Verifies if all approval system tables and columns exist
 */

require('dotenv').config();
const db = require('./src/database/connection');

async function checkSchema() {
  console.log('\n=== Checking Database Schema ===\n');

  try {
    // Check users table columns
    console.log('1. Checking users table columns...');
    const usersColumns = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\nUsers table columns:');
    usersColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check for new columns
    const requiredColumns = ['status', 'approval_date', 'approved_by', 'rejection_reason'];
    const existingColumns = usersColumns.rows.map(r => r.column_name);
    
    console.log('\nNew approval columns:');
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    // Check research_projects table
    console.log('\n2. Checking research_projects table...');
    const projectsTable = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'research_projects'
      )
    `);
    
    if (projectsTable.rows[0].exists) {
      console.log('✅ research_projects table exists');
      
      const projectsColumns = await db.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'research_projects'
        ORDER BY ordinal_position
      `);
      
      console.log('\nresearch_projects columns:');
      projectsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('❌ research_projects table does NOT exist');
    }

    // Check project_id in research_questions
    console.log('\n3. Checking project_id in research_questions...');
    const questionsProjectId = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'research_questions' AND column_name = 'project_id'
    `);
    
    if (questionsProjectId.rows.length > 0) {
      console.log('✅ project_id column exists in research_questions');
    } else {
      console.log('❌ project_id column does NOT exist in research_questions');
    }

    // Check project_id in research_responses
    console.log('\n4. Checking project_id in research_responses...');
    const responsesProjectId = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'research_responses' AND column_name = 'project_id'
    `);
    
    if (responsesProjectId.rows.length > 0) {
      console.log('✅ project_id column exists in research_responses');
    } else {
      console.log('❌ project_id column does NOT exist in research_responses');
    }

    // Check status constraint
    console.log('\n5. Checking status constraint...');
    const statusConstraint = await db.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users' AND constraint_name = 'users_status_check'
    `);
    
    if (statusConstraint.rows.length > 0) {
      console.log('✅ users_status_check constraint exists');
    } else {
      console.log('❌ users_status_check constraint does NOT exist');
    }

    // Check indexes
    console.log('\n6. Checking indexes...');
    const indexes = await db.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename IN ('research_projects', 'research_questions', 'research_responses')
      AND indexname LIKE '%project%'
    `);
    
    if (indexes.rows.length > 0) {
      console.log('Project-related indexes:');
      indexes.rows.forEach(idx => {
        console.log(`  ✅ ${idx.indexname} on ${idx.tablename}`);
      });
    } else {
      console.log('❌ No project-related indexes found');
    }

    // Check current user statuses
    console.log('\n7. Checking current user statuses...');
    const userStatuses = await db.query(`
      SELECT status, COUNT(*) as count
      FROM users
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.log('\nUser status distribution:');
    userStatuses.rows.forEach(row => {
      console.log(`  ${row.status || 'NULL'}: ${row.count} users`);
    });

    // Summary
    console.log('\n=== Summary ===\n');
    
    const allChecks = [
      existingColumns.includes('status'),
      existingColumns.includes('approval_date'),
      existingColumns.includes('approved_by'),
      existingColumns.includes('rejection_reason'),
      projectsTable.rows[0].exists,
      questionsProjectId.rows.length > 0,
      responsesProjectId.rows.length > 0,
      statusConstraint.rows.length > 0
    ];
    
    const passedChecks = allChecks.filter(Boolean).length;
    const totalChecks = allChecks.length;
    
    if (passedChecks === totalChecks) {
      console.log(`✅ ALL CHECKS PASSED (${passedChecks}/${totalChecks})`);
      console.log('\n✨ Database schema is ready for approval system!');
    } else {
      console.log(`⚠️  SOME CHECKS FAILED (${passedChecks}/${totalChecks} passed)`);
      console.log('\n❌ Database migration needs to be run!');
      console.log('\nTo run migration:');
      console.log('1. Go to Cloud Console SQL');
      console.log('2. Connect to database');
      console.log('3. Run: src/database/add-approval-system.sql');
    }

    console.log('\n');
    process.exit(passedChecks === totalChecks ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error checking schema:', error.message);
    process.exit(1);
  }
}

checkSchema();
