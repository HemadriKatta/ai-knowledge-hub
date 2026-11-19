-- Add additional document metadata
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS file_size BIGINT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Prevent duplicate documents per user
CREATE UNIQUE INDEX IF NOT EXISTS
idx_documents_user_checksum
ON documents(user_id, checksum)
WHERE checksum IS NOT NULL;

-- Index for document status
CREATE INDEX IF NOT EXISTS idx_documents_status
ON documents(status);

INSERT INTO users (
    id,
    name,
    email,
    password_hash
)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Development User',
    'dev@knowledgehub.local',
    'development-only'
)
ON CONFLICT (id) DO NOTHING;