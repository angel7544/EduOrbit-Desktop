ALTER TABLE public.courses ADD COLUMN instructor_name text;

-- Add the allow_download column with a default value of true
ALTER TABLE public.chapters 
ADD COLUMN allow_download BOOLEAN DEFAULT true;
ALTER TABLE public.courses 
ADD COLUMN allow_download BOOLEAN DEFAULT true;
