-- Add new columns to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_subject TEXT;

-- Enable RLS for these new columns if necessary (usually handled by existing policies)
-- Ensure teacher_id links to profiles (should already be the case, but good to verify/document)
-- CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES profiles(id)
