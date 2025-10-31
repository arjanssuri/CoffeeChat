-- Create applications table
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  school TEXT NOT NULL,
  deadline DATE,
  status TEXT CHECK (status IN ('draft', 'in-progress', 'submitted')) DEFAULT 'draft',
  content JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create essays table for individual essays within applications
CREATE TABLE essays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT,
  content TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for applications
CREATE POLICY "Users can view their own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications" ON applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications" ON applications
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for essays
CREATE POLICY "Users can view their own essays" ON essays
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM applications WHERE id = application_id));

CREATE POLICY "Users can insert their own essays" ON essays
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM applications WHERE id = application_id));

CREATE POLICY "Users can update their own essays" ON essays
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM applications WHERE id = application_id));

CREATE POLICY "Users can delete their own essays" ON essays
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM applications WHERE id = application_id));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_essays_updated_at BEFORE UPDATE ON essays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update word count
CREATE OR REPLACE FUNCTION update_essay_word_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.word_count = array_length(string_to_array(trim(NEW.content), ' '), 1);
    IF NEW.word_count IS NULL THEN
        NEW.word_count = 0;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update word count
CREATE TRIGGER update_essay_word_count_trigger BEFORE INSERT OR UPDATE ON essays
    FOR EACH ROW EXECUTE FUNCTION update_essay_word_count();