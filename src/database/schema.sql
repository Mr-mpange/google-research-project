-- Research System Database Schema
-- PostgreSQL Database Schema for AI-Powered Voice and USSD Research System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (researchers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'researcher' CHECK (role IN ('admin', 'researcher', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Research questions/topics
CREATE TABLE research_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    question_text TEXT NOT NULL,
    category VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- USSD sessions
CREATE TABLE ussd_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    service_code VARCHAR(20) NOT NULL,
    current_menu VARCHAR(50) DEFAULT 'main',
    menu_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    total_interactions INTEGER DEFAULT 0
);

-- Voice calls
CREATE TABLE voice_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) DEFAULT 'initiated',
    duration INTEGER DEFAULT 0,
    recording_url TEXT,
    recording_file_path TEXT,
    language VARCHAR(10) DEFAULT 'en',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Research responses (from both USSD and Voice)
CREATE TABLE research_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    question_id UUID REFERENCES research_questions(id),
    response_type VARCHAR(10) CHECK (response_type IN ('ussd', 'voice', 'text')),
    response_text TEXT,
    audio_file_path TEXT,
    audio_duration INTEGER,
    language VARCHAR(10) DEFAULT 'en',
    ussd_session_id UUID REFERENCES ussd_sessions(id),
    voice_call_id UUID REFERENCES voice_calls(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- AI transcriptions
CREATE TABLE transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID REFERENCES research_responses(id),
    original_audio_path TEXT NOT NULL,
    transcribed_text TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    language_detected VARCHAR(10),
    processing_duration INTEGER,
    service_used VARCHAR(50) DEFAULT 'openai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- AI summaries and analysis
CREATE TABLE ai_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID REFERENCES research_responses(id),
    transcription_id UUID REFERENCES transcriptions(id),
    summary_text TEXT NOT NULL,
    key_points JSONB DEFAULT '[]',
    themes JSONB DEFAULT '[]',
    sentiment VARCHAR(20),
    confidence_score DECIMAL(3,2),
    word_count INTEGER,
    processing_model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- System logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    component VARCHAR(50),
    phone_number VARCHAR(20),
    session_id VARCHAR(255),
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Research campaigns/projects
CREATE TABLE research_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    target_responses INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Link questions to campaigns
CREATE TABLE campaign_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES research_campaigns(id) ON DELETE CASCADE,
    question_id UUID REFERENCES research_questions(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, question_id)
);

-- Participant demographics (optional)
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    age_range VARCHAR(20),
    gender VARCHAR(10),
    location VARCHAR(100),
    education_level VARCHAR(50),
    occupation VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'en',
    consent_given BOOLEAN DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_ussd_sessions_phone ON ussd_sessions(phone_number);
CREATE INDEX idx_ussd_sessions_active ON ussd_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_voice_calls_phone ON voice_calls(phone_number);
CREATE INDEX idx_voice_calls_status ON voice_calls(status);
CREATE INDEX idx_research_responses_phone ON research_responses(phone_number);
CREATE INDEX idx_research_responses_question ON research_responses(question_id);
CREATE INDEX idx_research_responses_type ON research_responses(response_type);
CREATE INDEX idx_research_responses_created ON research_responses(created_at);
CREATE INDEX idx_transcriptions_response ON transcriptions(response_id);
CREATE INDEX idx_ai_summaries_response ON ai_summaries(response_id);
CREATE INDEX idx_system_logs_created ON system_logs(created_at);
CREATE INDEX idx_system_logs_level ON system_logs(level);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_questions_updated_at BEFORE UPDATE ON research_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_campaigns_updated_at BEFORE UPDATE ON research_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();