-- ===========================================
-- MEDICA SOERUTE - Initial Database Schema
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Enums
-- ===========================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE plan_type AS ENUM ('free', 'light', 'standard', 'premium');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE media_category AS ENUM ('general', 'nursing', 'pharmacy', 'dental', 'welfare', 'rehabilitation');

-- ===========================================
-- Users Table
-- ===========================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  company_name TEXT,
  role user_role DEFAULT 'user' NOT NULL,
  plan plan_type DEFAULT 'free' NOT NULL,
  monthly_analysis_count INTEGER DEFAULT 0 NOT NULL,
  monthly_analysis_limit INTEGER DEFAULT 3 NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Policy for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Admin can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ===========================================
-- Media Master Table
-- ===========================================

CREATE TABLE media_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category media_category NOT NULL,
  description TEXT,
  features JSONB DEFAULT '{}',
  price_range TEXT,
  target_audience TEXT,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Policy for media_master
ALTER TABLE media_master ENABLE ROW LEVEL SECURITY;

-- Everyone can read active media
CREATE POLICY "Anyone can view active media"
  ON media_master FOR SELECT
  USING (is_active = true);

-- Admin can manage all media
CREATE POLICY "Admins can manage media"
  ON media_master FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ===========================================
-- Analysis Results Table
-- ===========================================

CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_requirements JSONB NOT NULL,
  status analysis_status DEFAULT 'pending' NOT NULL,
  matched_media JSONB,
  analysis_detail JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster queries
CREATE INDEX idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX idx_analysis_results_status ON analysis_results(status);
CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at DESC);

-- RLS Policy for analysis_results
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis"
  ON analysis_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analysis"
  ON analysis_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis"
  ON analysis_results FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin can view all analysis
CREATE POLICY "Admins can view all analysis"
  ON analysis_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ===========================================
-- PESO Diagnoses Table
-- ===========================================

CREATE TABLE peso_diagnoses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diagnosis_data JSONB NOT NULL,
  scores JSONB NOT NULL,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster queries
CREATE INDEX idx_peso_diagnoses_user_id ON peso_diagnoses(user_id);
CREATE INDEX idx_peso_diagnoses_created_at ON peso_diagnoses(created_at DESC);

-- RLS Policy for peso_diagnoses
ALTER TABLE peso_diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnoses"
  ON peso_diagnoses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own diagnoses"
  ON peso_diagnoses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- Usage Logs Table
-- ===========================================

CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster queries
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_action_type ON usage_logs(action_type);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- RLS Policy for usage_logs
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own logs"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all logs
CREATE POLICY "Admins can view all logs"
  ON usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ===========================================
-- Functions
-- ===========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_master_updated_at
  BEFORE UPDATE ON media_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_results_updated_at
  BEFORE UPDATE ON analysis_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to reset monthly analysis count
CREATE OR REPLACE FUNCTION reset_monthly_analysis_count()
RETURNS void AS $$
BEGIN
  UPDATE users SET monthly_analysis_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment analysis count
CREATE OR REPLACE FUNCTION increment_analysis_count(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT monthly_analysis_count, monthly_analysis_limit
  INTO v_count, v_limit
  FROM users
  WHERE id = p_user_id;

  -- Check if limit is unlimited (-1) or not reached
  IF v_limit = -1 OR v_count < v_limit THEN
    UPDATE users
    SET monthly_analysis_count = monthly_analysis_count + 1
    WHERE id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
