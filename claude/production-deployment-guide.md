# Production Deployment Guide - Supabase Storage

## Overview
This document provides comprehensive guidance for deploying Supabase Storage infrastructure to production environments with enterprise-grade security, performance, and reliability considerations.

## 🚨 Critical Production Requirements

### Security Requirements
- [ ] **Private bucket access** - Public access MUST be disabled
- [ ] **Row-Level Security (RLS)** policies implemented
- [ ] **Authentication-based access** control configured
- [ ] **CORS policies** properly configured for production domains
- [ ] **Service role key** properly secured and rotated
- [ ] **Audit logging** enabled for all storage operations

### Performance Requirements
- [ ] **CDN integration** for file delivery optimization
- [ ] **File size optimization** and compression strategies
- [ ] **Concurrent upload limits** configured
- [ ] **Rate limiting** implemented for storage operations
- [ ] **Monitoring and alerting** configured for storage metrics

### Compliance Requirements
- [ ] **Data retention policies** implemented
- [ ] **Backup and recovery** procedures established
- [ ] **Encryption at rest** and in transit verified
- [ ] **Access audit trails** maintained
- [ ] **GDPR/compliance** data handling procedures

## Pre-Production Checklist

### 1. Environment Preparation

#### Supabase Project Setup
```bash
# Ensure production Supabase project is properly configured
# Verify project tier supports required storage features
# Check storage quotas and limits for production usage
# Validate project access controls and team permissions
```

#### Required Production Environment Variables
```bash
# Production Supabase Configuration
SUPABASE_URL=https://YOUR_PROD_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key  # KEEP SECURE!

# Storage Configuration
STORAGE_BUCKET_NAME=transcripts
STORAGE_MAX_FILE_SIZE=52428800  # 50MB
STORAGE_CDN_ENABLED=true
STORAGE_AUDIT_LOGGING=true

# Security Configuration
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
UPLOAD_RATE_LIMIT=10  # uploads per minute per user
MAX_CONCURRENT_UPLOADS=3

# Monitoring
STORAGE_ALERTS_EMAIL=ops@yourdomain.com
STORAGE_QUOTA_WARNING_THRESHOLD=80  # Alert at 80% quota
```

### 2. Security Configuration

#### Production Storage Migration
```sql
-- Production-specific storage bucket with enhanced security
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transcripts',
  'transcripts',
  false,  -- CRITICAL: Private access only in production
  52428800,  -- 50MB limit
  ARRAY[
    'application/json',
    'text/plain',
    'text/srt',
    'text/vtt'
    -- Note: Removed 'application/octet-stream' for production security
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
```

#### Row-Level Security Policies
```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload to transcripts bucket
CREATE POLICY "Allow authenticated uploads to transcripts" ON storage.objects
  FOR INSERT 
  TO authenticated
  WITH CHECK (bucket_id = 'transcripts');

-- Policy: Allow users to access their own files
CREATE POLICY "Allow access to own transcripts" ON storage.objects
  FOR SELECT 
  TO authenticated
  USING (bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow users to delete their own files
CREATE POLICY "Allow users to delete own transcripts" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Service role can manage all transcripts (for admin operations)
CREATE POLICY "Service role full access" ON storage.objects
  TO service_role
  USING (bucket_id = 'transcripts');
```

#### Additional Security Hardening
```sql
-- Create audit trigger for storage operations
CREATE OR REPLACE FUNCTION audit_storage_operations()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    operation,
    user_id,
    object_name,
    timestamp,
    metadata
  ) VALUES (
    'storage.objects',
    TG_OP,
    auth.uid(),
    COALESCE(NEW.name, OLD.name),
    NOW(),
    jsonb_build_object(
      'bucket_id', COALESCE(NEW.bucket_id, OLD.bucket_id),
      'size', COALESCE(NEW.metadata->>'size', OLD.metadata->>'size')
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger
CREATE TRIGGER audit_storage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION audit_storage_operations();
```

### 3. Performance Optimization

#### CDN Configuration
```toml
# Add to production config.toml
[storage]
enabled = true
file_size_limit = "50MiB"

# Production CDN settings
[storage.cdn]
enabled = true
cache_control = "public, max-age=31536000"  # 1 year cache
compress = true

[storage.buckets.transcripts]
public = false  # CRITICAL: Private in production
file_size_limit = "50MiB"
allowed_mime_types = [
  "application/json",
  "text/plain", 
  "text/srt",
  "text/vtt"
]
```

#### Production CORS Configuration
```sql
-- Configure CORS for production domains only
UPDATE storage.buckets 
SET cors = jsonb_build_array(
  jsonb_build_object(
    'allowedOrigins', ARRAY['https://yourdomain.com', 'https://www.yourdomain.com'],
    'allowedMethods', ARRAY['GET', 'POST', 'PUT', 'DELETE'],
    'allowedHeaders', ARRAY['authorization', 'content-type'],
    'maxAge', 3600
  )
)
WHERE id = 'transcripts';
```

### 4. Monitoring and Alerting

#### Storage Metrics Monitoring
```yaml
# Production monitoring configuration
storage_metrics:
  - metric: "storage_quota_usage"
    alert_threshold: 80
    alert_email: "ops@yourdomain.com"
    
  - metric: "upload_error_rate" 
    alert_threshold: 5  # 5% error rate
    window: "5m"
    
  - metric: "storage_response_time"
    alert_threshold: "2s"
    percentile: 95
    
  - metric: "concurrent_uploads"
    alert_threshold: 100
    action: "rate_limit"
```

#### Application-Level Monitoring
```typescript
// Production storage monitoring integration
export class ProductionStorageService {
  private metrics = new MetricsCollector();
  
  async uploadTranscript(file: File, userId: string): Promise<UploadResult> {
    const startTime = Date.now();
    
    try {
      // Pre-upload validation
      await this.validateUpload(file, userId);
      
      // Track upload metrics
      this.metrics.increment('storage.upload.attempts');
      
      const result = await this.supabaseStorage.upload(
        `${userId}/${generateId()}.${getFileExtension(file.name)}`,
        file
      );
      
      // Success metrics
      this.metrics.timing('storage.upload.duration', Date.now() - startTime);
      this.metrics.increment('storage.upload.success');
      
      return result;
      
    } catch (error) {
      // Error metrics and alerting
      this.metrics.increment('storage.upload.errors');
      this.metrics.increment(`storage.upload.error.${error.code}`);
      
      // Alert on critical errors
      if (this.isCriticalError(error)) {
        await this.alerting.send({
          severity: 'high',
          message: `Storage upload failure: ${error.message}`,
          context: { userId, fileName: file.name }
        });
      }
      
      throw error;
    }
  }
}
```

## Deployment Procedures

### 5. Production Migration Deployment

#### Pre-Deployment Validation
```bash
# 1. Backup current production state
supabase db dump --linked --data-only > production_backup_$(date +%Y%m%d).sql

# 2. Test migrations in staging environment first
supabase db push --dry-run

# 3. Validate migration SQL against production schema
supabase migration validate --linked
```

#### Production Deployment Steps
```bash
# 1. Connect to production project
supabase link --project-ref PRODUCTION_PROJECT_REF

# 2. Apply storage migrations with zero-downtime approach
supabase db push --include-all

# 3. Verify bucket creation
supabase storage ls

# 4. Test core functionality immediately
supabase storage info transcripts
```

#### Post-Deployment Verification
```bash
# Verify security policies
supabase sql "SELECT * FROM storage.policies WHERE bucket_id = 'transcripts';"

# Check bucket configuration
supabase sql "SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'transcripts';"

# Test upload functionality with service role
curl -X POST "https://PROD_PROJECT.supabase.co/storage/v1/object/transcripts/test.json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  --data '{"test": "production_validation"}'
```

### 6. Security Validation

#### Production Security Checklist
- [ ] **Public access disabled**: `public = false` confirmed
- [ ] **RLS policies active**: All policies created and enabled
- [ ] **Authentication required**: Anonymous access blocked
- [ ] **CORS properly configured**: Only production domains allowed
- [ ] **Service role secured**: Key stored securely, rotated regularly
- [ ] **Audit logging active**: All operations logged
- [ ] **File type restrictions**: Only approved MIME types allowed
- [ ] **Size limits enforced**: 50MB limit confirmed

#### Security Test Procedures
```bash
# 1. Test anonymous access (should fail)
curl "https://PROD_PROJECT.supabase.co/storage/v1/object/transcripts/test.json"
# Expected: 403 Forbidden

# 2. Test unauthorized domain (should fail)
curl -H "Origin: https://malicious-domain.com" \
     "https://PROD_PROJECT.supabase.co/storage/v1/object/transcripts/test.json"
# Expected: CORS error

# 3. Test oversized file (should fail)
curl -X POST "..." --data-binary "@51mb_file.txt"
# Expected: File size exceeded error

# 4. Test invalid MIME type (should fail)
curl -X POST "..." -H "Content-Type: application/executable" --data "malicious"
# Expected: MIME type not allowed error
```

## Disaster Recovery

### 7. Backup and Recovery Procedures

#### Automated Backup Strategy
```bash
# Daily backup script for production
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/supabase_storage/$DATE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Export storage bucket metadata
supabase sql "SELECT * FROM storage.objects WHERE bucket_id = 'transcripts';" \
  --output csv > "$BACKUP_DIR/storage_metadata.csv"

# Export RLS policies
supabase sql "SELECT * FROM storage.policies WHERE bucket_id = 'transcripts';" \
  --output csv > "$BACKUP_DIR/storage_policies.csv"

# Sync storage files (if using external backup)
# Note: Supabase handles file durability, but metadata backup is critical
```

#### Recovery Procedures
```bash
# 1. Restore bucket configuration
supabase migration up --to LATEST_STORAGE_MIGRATION

# 2. Restore RLS policies from backup
psql -f storage_policies_restore.sql

# 3. Validate recovery
supabase storage ls
supabase sql "SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'transcripts';"
```

### 8. Incident Response

#### Storage Incident Severity Levels

**P0 - Critical (Complete Storage Outage)**
- Storage bucket inaccessible
- Authentication system down
- Data corruption detected
- Response Time: 15 minutes

**P1 - High (Degraded Performance)**
- Slow upload/download speeds
- Intermittent access issues
- Quota approaching limits
- Response Time: 1 hour

**P2 - Medium (Functional Issues)**
- Policy misconfiguration
- CORS issues
- Non-critical monitoring alerts
- Response Time: 4 hours

#### Incident Response Runbook
```bash
# P0 Incident Response
1. Assess impact and communicate to stakeholders
2. Enable maintenance mode if necessary
3. Check Supabase status page: https://status.supabase.com
4. Verify database connectivity: supabase status
5. Check storage bucket accessibility: supabase storage ls
6. Review recent deployments and rollback if needed
7. Escalate to Supabase support if infrastructure issue
8. Document incident and create post-mortem
```

## Compliance and Governance

### 9. Data Governance

#### Data Retention Policy
```sql
-- Implement automatic transcript cleanup after retention period
CREATE OR REPLACE FUNCTION cleanup_old_transcripts()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete transcripts older than 7 years (adjust based on requirements)
  DELETE FROM storage.objects 
  WHERE bucket_id = 'transcripts' 
    AND created_at < NOW() - INTERVAL '7 years';
    
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily cleanup
SELECT cron.schedule('cleanup-old-transcripts', '0 2 * * *', 'SELECT cleanup_old_transcripts();');
```

#### Audit Compliance
```sql
-- Create audit log table for compliance
CREATE TABLE IF NOT EXISTS storage_audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  operation TEXT NOT NULL,
  object_name TEXT,
  bucket_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB
);

-- Index for audit queries
CREATE INDEX idx_storage_audit_timestamp ON storage_audit_log(timestamp);
CREATE INDEX idx_storage_audit_user ON storage_audit_log(user_id);
CREATE INDEX idx_storage_audit_operation ON storage_audit_log(operation);
```

### 10. Cost Optimization

#### Storage Cost Management
```sql
-- Monitor storage usage by user
CREATE VIEW storage_usage_by_user AS
SELECT 
  (storage.foldername(name))[1] as user_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1048576.0, 2) as total_mb
FROM storage.objects 
WHERE bucket_id = 'transcripts'
GROUP BY (storage.foldername(name))[1]
ORDER BY total_bytes DESC;

-- Storage quota alerts
CREATE OR REPLACE FUNCTION check_storage_quota()
RETURNS BOOLEAN AS $$
DECLARE
  total_usage BIGINT;
  quota_limit BIGINT := 10737418240; -- 10GB in bytes
BEGIN
  SELECT SUM((metadata->>'size')::bigint) INTO total_usage
  FROM storage.objects WHERE bucket_id = 'transcripts';
  
  IF total_usage > quota_limit * 0.8 THEN
    -- Send alert when 80% of quota is reached
    PERFORM pg_notify('storage_quota_warning', 
      json_build_object('usage', total_usage, 'limit', quota_limit)::text
    );
  END IF;
  
  RETURN total_usage < quota_limit;
END;
$$ LANGUAGE plpgsql;
```

## Production Readiness Certification

### 11. Final Production Checklist

#### Infrastructure Readiness
- [ ] **Supabase project**: Pro/Team tier with adequate storage quotas
- [ ] **Database**: Production-ready configuration with connection pooling
- [ ] **Storage bucket**: Private access with proper RLS policies
- [ ] **CDN**: Configured for optimal file delivery
- [ ] **Monitoring**: Comprehensive metrics and alerting setup

#### Security Certification
- [ ] **Access controls**: Authentication-based access verified
- [ ] **Data encryption**: At-rest and in-transit encryption confirmed
- [ ] **Audit logging**: All storage operations tracked
- [ ] **Vulnerability assessment**: Security scan completed
- [ ] **Penetration testing**: External security testing passed

#### Operational Readiness
- [ ] **Backup procedures**: Automated backup and recovery tested
- [ ] **Incident response**: Runbooks created and team trained
- [ ] **Performance testing**: Load testing under production conditions
- [ ] **Monitoring dashboards**: Operations team can monitor system health
- [ ] **Documentation**: All procedures documented and accessible

#### Compliance Verification
- [ ] **Data retention**: Policies implemented and automated
- [ ] **Audit trails**: Compliance reporting capabilities verified
- [ ] **Privacy controls**: GDPR/privacy requirements addressed
- [ ] **Governance**: Data governance policies in place

### 12. Go-Live Approval

**Required Sign-offs:**
- [ ] **Security Team**: Security requirements met
- [ ] **Operations Team**: Monitoring and incident response ready  
- [ ] **Compliance Team**: Regulatory requirements satisfied
- [ ] **Engineering Team**: Technical implementation verified
- [ ] **Product Team**: Feature functionality validated

**Go-Live Criteria Met:**
- [ ] All production checklist items completed
- [ ] Security certification passed
- [ ] Performance benchmarks achieved
- [ ] Disaster recovery procedures tested
- [ ] Team training completed

---

**Document Version**: 1.0  
**Last Updated**: 2025-06-25  
**Classification**: Internal - Production Deployment  
**Review Schedule**: Quarterly  
**Created For**: Issue #129 - Supabase Storage Infrastructure Setup