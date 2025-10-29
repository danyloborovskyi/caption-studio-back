-- Migration: Switch from Sequential IDs to UUIDs for uploaded_files
-- This prevents information disclosure and IDOR enumeration attacks
-- 
-- IMPORTANT: This is a breaking change if you have existing data!
-- Test in development first.

-- ==========================================
-- Option 1: Create NEW table with UUID (RECOMMENDED)
-- ==========================================

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create new table with UUID primary key
CREATE TABLE uploaded_files_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size BIGINT,
    mime_type TEXT,
    public_url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'uploaded',
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Add any other columns from your current table
    CONSTRAINT valid_status CHECK (status IN ('uploaded', 'processing', 'completed', 'failed'))
);

-- Step 3: Copy data from old table (if you have existing data)
-- Note: This generates NEW UUIDs for all records
INSERT INTO uploaded_files_new (
    filename, file_path, file_size, mime_type, public_url,
    user_id, status, description, tags, uploaded_at, updated_at
)
SELECT 
    filename, 
    file_path, 
    file_size, 
    mime_type, 
    public_url,
    user_id, 
    status, 
    description, 
    -- Cast tags to JSONB (handles both JSONB and text[] types)
    COALESCE(to_jsonb(tags), '[]'::jsonb) as tags,
    uploaded_at, 
    updated_at
FROM uploaded_files
WHERE user_id IS NOT NULL; -- Only migrate files with user_id

-- Step 4: Create indexes
CREATE INDEX idx_uploaded_files_new_user_id ON uploaded_files_new(user_id);
CREATE INDEX idx_uploaded_files_new_user_uploaded ON uploaded_files_new(user_id, uploaded_at DESC);
CREATE INDEX idx_uploaded_files_new_status ON uploaded_files_new(status);
CREATE INDEX idx_uploaded_files_new_file_path ON uploaded_files_new(file_path);

-- Step 5: Enable RLS on new table
ALTER TABLE uploaded_files_new ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies
CREATE POLICY "Users can view own files"
ON uploaded_files_new
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
ON uploaded_files_new
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
ON uploaded_files_new
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
ON uploaded_files_new
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can access all files"
ON uploaded_files_new
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 7: Rename tables (ATOMIC SWAP)
-- ⚠️ WARNING: This will cause brief downtime during the swap
-- Run during maintenance window or use a blue-green deployment
BEGIN;
  ALTER TABLE uploaded_files RENAME TO uploaded_files_old;
  ALTER TABLE uploaded_files_new RENAME TO uploaded_files;
COMMIT;

-- Step 8: Verify the migration
SELECT 
    id,
    filename,
    user_id,
    uploaded_at
FROM uploaded_files
LIMIT 5;

-- Check that IDs are now UUIDs
SELECT 
    pg_typeof(id) as id_type,
    COUNT(*) as total_records
FROM uploaded_files
GROUP BY pg_typeof(id);

-- Step 9: (OPTIONAL) Drop old table after verification
-- Wait 24-48 hours and verify everything works before running this!
-- DROP TABLE uploaded_files_old;

-- ==========================================
-- Option 2: Modify existing table (SIMPLER but has limitations)
-- ==========================================
-- Uncomment if you prefer to modify in-place (loses old IDs):

/*
-- Add new UUID column
ALTER TABLE uploaded_files ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();

-- Make it NOT NULL
ALTER TABLE uploaded_files ALTER COLUMN new_id SET NOT NULL;

-- Drop old primary key
ALTER TABLE uploaded_files DROP CONSTRAINT uploaded_files_pkey;

-- Drop old id column
ALTER TABLE uploaded_files DROP COLUMN id;

-- Rename new_id to id
ALTER TABLE uploaded_files RENAME COLUMN new_id TO id;

-- Add primary key constraint
ALTER TABLE uploaded_files ADD PRIMARY KEY (id);
*/

-- ==========================================
-- Verification Queries
-- ==========================================

-- Check table structure
\d uploaded_files;

-- Verify UUID format
SELECT 
    id,
    filename,
    LENGTH(id::text) as uuid_length,
    uploaded_at
FROM uploaded_files
LIMIT 10;

-- Check RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies
WHERE tablename = 'uploaded_files';

-- ==========================================
-- Success! 🎉
-- ==========================================
-- Now your file IDs are UUIDs instead of sequential integers.
-- Example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' instead of 524
-- 
-- Benefits:
-- ✅ No information disclosure
-- ✅ Cannot enumerate records
-- ✅ Cannot determine total record count
-- ✅ No timing attack vectors
-- ✅ Industry standard for public-facing IDs

