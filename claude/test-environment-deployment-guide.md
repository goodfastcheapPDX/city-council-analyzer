# Test Environment Deployment Guide - Supabase Storage

## Overview
This document provides step-by-step instructions for deploying the Supabase Storage infrastructure to test environments. It covers the deployment of the `transcripts` bucket configuration, RLS policies, and validation procedures.

## Prerequisites

### Required Tools
- [ ] Supabase CLI (v1.68.0 or later)
- [ ] Access to test Supabase project
- [ ] Valid project credentials for test environment
- [ ] Git access to storage migrations

### Required Permissions
- [ ] Supabase project admin or database admin access
- [ ] Ability to run migrations on test database
- [ ] Ability to create and configure storage buckets
- [ ] Access to test environment configuration variables

## Environment Setup

### 1. Connect to Test Supabase Project

```bash
# Login to Supabase (if not already authenticated)
npx supabase login

# Link to your test project (replace with actual test project reference)
npx supabase link --project-ref YOUR_TEST_PROJECT_REF

# Verify connection
npx supabase status
```

### 2. Verify Current Migration Status

```bash
# Check applied migrations in test environment
npx supabase migration list

# Check local migration files
ls -la supabase/migrations/

# Ensure test environment is up to date with latest schema
npx supabase db pull
```

## Storage Bucket Deployment

### 3. Apply Storage Migration

```bash
# Apply all pending migrations (including storage setup)
npx supabase db push

# Or apply pending migrations to local database
npx supabase migration up
```

**Expected Migration Files to Apply:**
- `20250624212553_add_transcripts_bucket.sql` - Core bucket creation
- `20250625000001_update_transcripts_bucket_mime_types.sql` - MIME type updates
- `20250625000002_fix_transcripts_bucket_mime_types.sql` - MIME type fixes

### 4. Configure Storage Bucket Settings

The migrations will automatically create the `transcripts` bucket with these settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| **Bucket ID** | `transcripts` | Unique bucket identifier |
| **Public Access** | `true` | Allows public read access for testing |
| **File Size Limit** | `50MB` | Maximum file size per upload |
| **Allowed MIME Types** | JSON, TXT, SRT, VTT, Octet-Stream | Supported transcript formats |

### 5. Verify Bucket Creation

#### Via Supabase Dashboard
1. Navigate to test project Dashboard → Storage
2. Confirm `transcripts` bucket exists
3. Check bucket settings match expected configuration
4. Verify public access is enabled

#### Via Supabase CLI
```bash
# List storage buckets
npx supabase storage ls

# Check bucket configuration  
npx supabase storage info transcripts
```

## Security Configuration

### 6. Review RLS Policies

The test environment uses **public access** for simplified testing. Verify these policies are in place:

```sql
-- Query to check bucket policies
SELECT * FROM storage.policies WHERE bucket_id = 'transcripts';

-- Query to check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'transcripts';
```

### 7. Test Environment Security Notes

⚠️ **Important Security Considerations for Test Environment:**

- **Public Access**: Enabled for testing - files are publicly readable
- **No Authentication Required**: Upload/delete operations may require auth depending on setup
- **File Size Enforcement**: 50MB limit enforced at bucket level
- **MIME Type Restrictions**: Only approved transcript formats allowed

## Validation and Testing

### 8. File Upload Testing

#### Test via Supabase Dashboard
1. Navigate to Storage → transcripts bucket
2. Click "Upload file"
3. Upload a sample JSON transcript file
4. Verify successful upload and public URL generation

#### Test via cURL (if public upload enabled)
```bash
# Test file upload (adjust endpoint for your test project)
curl -X POST 'https://znybssicqofaendbrnbt.supabase.co/storage/v1/object/transcripts/test-file.json' \
  -H 'Authorization: Bearer {key}' \
  -H 'Content-Type: application/json' \
  --data-binary '@sample-data/city-council-2024-01-15.txt'

# Test public file access
curl 'https://znybssicqofaendbrnbt.supabase.co/storage/v1/object/public/transcripts/test-file.json'
```

### 9. File Size Limit Testing

```bash
# Create a test file larger than 50MB
dd if=/dev/zero of=large-test-file.txt bs=1M count=51

# Attempt upload (should fail)
# Via dashboard or API - should return file size error
```

### 10. MIME Type Validation Testing

```bash
# Test valid MIME types (should succeed)
curl -X POST '...' --data-binary '@test.json'   # application/json
curl -X POST '...' --data-binary '@test.txt'    # text/plain
curl -X POST '...' --data-binary '@test.srt'    # text/srt

# Test invalid MIME type (should fail)
curl -X POST '...' --data-binary '@test.pdf'    # Should be rejected
```

## Environment-Specific Configuration

### 11. Test Environment Variables

Ensure these environment variables are set in your test environment:

```bash
# Required for test environment
SUPABASE_URL=https://YOUR_TEST_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_key

# Optional for testing
STORAGE_BUCKET_NAME=transcripts
STORAGE_MAX_FILE_SIZE=52428800  # 50MB in bytes
```

### 12. Application Configuration

The application configuration for Supabase Storage is already integrated into the codebase at `src/lib/config.ts`. The configuration automatically adapts to your test environment when the proper environment variables are set.

**Configuration Location**: `src/lib/config.ts`

```typescript
// Configuration is automatically loaded from environment variables
import { config } from '@/lib/config';

// Access Supabase configuration
const supabaseConfig = config.supabase;
const storageConfig = config.storage;
```

**Key Configuration Values**:
- **Bucket Name**: `transcripts` (matches deployed bucket)
- **File Size Limit**: `50MB` (matches bucket configuration)
- **MIME Types**: Matches bucket allowed types
- **Public Access**: Enabled for development/test environments

## Troubleshooting

### Common Issues and Solutions

#### **Issue: Bucket not found after migration**
```bash
# Solution: Re-run storage migration
supabase migration up --to 20250624212553

# Verify bucket creation manually
supabase sql --db-url "postgresql://..." < supabase/migrations/20250624212553_add_transcripts_bucket.sql
```

#### **Issue: File uploads rejected with permission errors**
```bash
# Check bucket public setting
SELECT public FROM storage.buckets WHERE id = 'transcripts';

# Should return: public = true for test environment
```

#### **Issue: File size limit not enforced**
```bash
# Verify bucket file size limit
SELECT file_size_limit FROM storage.buckets WHERE id = 'transcripts';

# Should return: file_size_limit = 52428800 (50MB)
```

#### **Issue: MIME type rejection**
```bash
# Check allowed MIME types
SELECT allowed_mime_types FROM storage.buckets WHERE id = 'transcripts';

# Verify array includes expected types
```

## Rollback Procedures

### 13. Emergency Rollback

If deployment fails or causes issues:

```bash
# Remove the transcripts bucket
supabase sql "DELETE FROM storage.buckets WHERE id = 'transcripts';"

# Rollback migrations if needed
supabase migration down --to PREVIOUS_MIGRATION_VERSION

# Clear local storage
rm -rf supabase/storage/transcripts/*
```

## Success Criteria

### 14. Deployment Validation Checklist

- [ ] **Bucket Creation**: `transcripts` bucket exists in test environment
- [ ] **Public Access**: Bucket configured for public read access  
- [ ] **File Size Limit**: 50MB limit properly enforced
- [ ] **MIME Type Validation**: Only allowed file types accepted
- [ ] **Upload Functionality**: Files can be uploaded successfully
- [ ] **Public URL Access**: Uploaded files accessible via public URLs
- [ ] **Error Handling**: Invalid files and oversized files properly rejected
- [ ] **Environment Variables**: Test environment properly configured
- [ ] **Migration Status**: All storage migrations applied successfully

## Next Steps

After successful test environment deployment:

1. **Integration Testing**: Test transcript upload workflow end-to-end
2. **Load Testing**: Verify performance with multiple file uploads
3. **Security Review**: Validate access controls work as expected
4. **Documentation Update**: Record any environment-specific configurations
5. **Production Planning**: Prepare production deployment with stricter security

## Support and References

- **Supabase Storage Documentation**: https://supabase.com/docs/guides/storage
- **Supabase CLI Reference**: https://supabase.com/docs/reference/cli
- **Migration Management**: https://supabase.com/docs/guides/database/migrations
- **Storage Security**: https://supabase.com/docs/guides/storage/security

---

**Document Version**: 1.0  
**Last Updated**: 2025-06-25  
**Created For**: Issue #129 - Supabase Storage Infrastructure Setup