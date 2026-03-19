-- Add PPTX and HTML support to documents

-- 1. Update storage bucket mime types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/html'
]
WHERE id = 'documents';

-- 2. Update documents table CHECK constraint to allow pptx and html
ALTER TABLE documents DROP CONSTRAINT documents_file_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_file_type_check
  CHECK (file_type IN ('pdf', 'docx', 'pptx', 'txt', 'md', 'html'));
