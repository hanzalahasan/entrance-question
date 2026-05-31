-- Run this in your Supabase SQL editor to set up the schema.

CREATE TABLE subjects (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE topics (
  id serial PRIMARY KEY,
  subject_id integer NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE questions (
  id bigserial PRIMARY KEY,
  uuid text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  answer text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  subject_id integer NOT NULL REFERENCES subjects (id),
  topic_id integer NOT NULL REFERENCES topics (id),
  subject_name text,
  topic_name text,
  year text,
  repeated_years text[] NOT NULL DEFAULT '{}',
  repeat_count integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'practice' CHECK (source IN ('past_year', 'practice')),
  import_source text NOT NULL DEFAULT 'manual' CHECK (import_source IN ('manual', 'excel', 'pdf', 'ai_generated')),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'unpublished')),
  media jsonb,
  ai_tags text[] NOT NULL DEFAULT '{}',
  ai_review_status text NOT NULL DEFAULT 'not_checked',
  duplicate_check_status text NOT NULL DEFAULT 'not_checked',
  possible_duplicate_ids bigint[] NOT NULL DEFAULT '{}',
  is_mock_eligible boolean NOT NULL DEFAULT true,
  created_by text,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable Row Level Security (open for now; lock down per your auth strategy)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "public read topics" ON topics FOR SELECT USING (true);
CREATE POLICY "public read published questions" ON questions FOR SELECT USING (status = 'published');
CREATE POLICY "service write subjects" ON subjects FOR ALL USING (true);
CREATE POLICY "service write topics" ON topics FOR ALL USING (true);
CREATE POLICY "service write questions" ON questions FOR ALL USING (true);

-- Seed subjects
INSERT INTO subjects (name, slug, status, display_order) VALUES
  ('Physics', 'physics', 'active', 1),
  ('Chemistry', 'chemistry', 'active', 2),
  ('Botany', 'botany', 'active', 3),
  ('Zoology', 'zoology', 'active', 4),
  ('Mathematics', 'mathematics', 'active', 5);

-- Seed topics
INSERT INTO topics (subject_id, name, slug, status, display_order) VALUES
  (1, 'Mechanics', 'mechanics', 'active', 1),
  (1, 'Electricity', 'electricity', 'active', 2),
  (2, 'Atomic Structure', 'atomic-structure', 'active', 1),
  (2, 'Bonding', 'bonding', 'active', 2),
  (3, 'Photosynthesis', 'photosynthesis', 'active', 1),
  (4, 'Cell Biology', 'cell-biology', 'active', 1),
  (5, 'Algebra', 'algebra', 'active', 1);
