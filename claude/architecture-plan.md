# City Council Analyzer - Complete Architecture & Implementation Plan

## Project Vision

Build an AI-powered transcript analysis system that transforms city council meeting recordings into searchable, analyzable knowledge. The system enables users to:

1. **Upload** transcripts in multiple formats (JSON, SRT, VTT, text)
2. **Process** content through intelligent segmentation and normalization
3. **Analyze** content using vector embeddings and LLM-powered insights
4. **Query** transcripts with semantic search and contextual retrieval
5. **Discover** trends, speaker patterns, and policy evolution over time

## System Architecture Overview

### High-Level Data Flow
```
Raw Upload → Format Detection → Parsing → Normalization → Validation
     ↓
Storage (Raw + Processed) → Segmentation → Token Counting
     ↓
Vector Embeddings → Indexing → Analysis Engines
     ↓
Query Interface → RAG Pipeline → LLM Analysis → User Results
```

### Core System Components

#### **1. Ingestion Layer (P0 Foundation)**
- **Format Detection**: Automatic format identification
- **Multi-Format Parsers**: JSON, SRT, VTT, plain text support
- **Content Normalization**: Speaker standardization, text cleaning
- **Schema Validation**: Zod-based validation with clear error messages
- **Upload API**: RESTful endpoints with progress tracking

#### **2. Storage Layer (P0 Foundation)**
- **Blob Storage**: Vercel Blob for transcript content (raw + processed)
- **Metadata Database**: Supabase for structured data and relationships
- **Versioning System**: Track transcript changes and processing history
- **Caching Layer**: Redis-compatible caching for performance

#### **3. Processing Layer (P1 Processing)**
- **Segmentation Engine**: Speaker-based and semantic boundary detection
- **Token Management**: OpenAI-compatible token counting and limits
- **Quality Assessment**: Content validation and processing metrics
- **Pipeline Orchestration**: Reliable, resumable processing workflows

#### **4. AI/ML Layer (P1-P2 Processing)**
- **Vector Embeddings**: OpenAI embeddings with batch processing
- **Embedding Storage**: Vector database with similarity search
- **Speaker Profiling**: Aggregated speaker characteristics and patterns
- **Content Indexing**: Searchable indexes for rapid retrieval

#### **5. Analysis Layer (P2 Analysis)**
- **RAG Engine**: Context retrieval and prompt assembly
- **LLM Integration**: Provider-agnostic LLM service abstraction
- **Topic Analysis**: Automated topic extraction and classification
- **Trend Detection**: Temporal analysis and pattern recognition

#### **6. Query Interface (P2-P3 Analysis)**
- **Semantic Search**: Vector similarity with metadata filtering
- **Contextual Retrieval**: Multi-faceted search with relevance ranking
- **Analysis Endpoints**: Structured queries for specific insights
- **Streaming Responses**: Real-time result delivery

## Detailed Technical Architecture

### Database Schema Design

#### Core Tables (Supabase)
```sql
-- Core transcript metadata
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  date DATE NOT NULL,
  format transcript_format NOT NULL,
  processing_status processing_status_enum DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  blob_url TEXT NOT NULL,
  blob_key VARCHAR(500) NOT NULL,
  version_number INTEGER DEFAULT 1,
  content_hash VARCHAR(64),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcript segments for search and analysis
CREATE TABLE transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  speaker_name VARCHAR(255),
  start_time_ms INTEGER,
  end_time_ms INTEGER,
  token_count INTEGER NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transcript_id, segment_index)
);

-- Speaker tracking and profiling
CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  role VARCHAR(100),
  profile_embedding vector(1536),
  topic_associations JSONB DEFAULT '{}'::jsonb,
  speech_patterns JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing jobs and status tracking
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  job_type processing_job_type NOT NULL,
  status job_status_enum DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  progress_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis results and caching
CREATE TABLE analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  query_type analysis_type NOT NULL,
  results JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Indexes for Performance
```sql
-- Transcript queries
CREATE INDEX idx_transcripts_date ON transcripts(date);
CREATE INDEX idx_transcripts_processing_status ON transcripts(processing_status);
CREATE INDEX idx_transcripts_source_id ON transcripts(source_id);

-- Segment search and retrieval
CREATE INDEX idx_segments_transcript_id ON transcript_segments(transcript_id);
CREATE INDEX idx_segments_speaker ON transcript_segments(speaker_name);
CREATE INDEX idx_segments_embedding ON transcript_segments USING ivfflat (embedding vector_cosine_ops);

-- Speaker analysis
CREATE INDEX idx_speakers_normalized_name ON speakers(normalized_name);
CREATE INDEX idx_speakers_embedding ON speakers USING ivfflat (profile_embedding vector_cosine_ops);

-- Job monitoring
CREATE INDEX idx_jobs_transcript_status ON processing_jobs(transcript_id, status);
CREATE INDEX idx_jobs_type_status ON processing_jobs(job_type, status);
```

### Storage Strategy

#### Blob Storage Organization (Vercel Blob)
```
transcripts/
├── raw/
│   └── {source_id}/
│       ├── v1/
│       │   ├── {timestamp}_original.{ext}
│       │   └── {timestamp}_metadata.json
│       └── v2/
│           ├── {timestamp}_original.{ext}
│           └── {timestamp}_metadata.json
├── processed/
│   └── {source_id}/
│       ├── v1/
│       │   ├── {timestamp}_normalized.json
│       │   ├── {timestamp}_segments.json
│       │   └── {timestamp}_analysis.json
│       └── v2/
│           └── ...
└── exports/
    └── {export_id}/
        ├── {timestamp}_full_export.json
        └── {timestamp}_summary.json
```

#### Caching Strategy
- **Redis/Memory**: API response caching, session data
- **Database**: Analysis result caching with TTL
- **CDN**: Static assets, processed transcript previews

### API Design

#### RESTful Endpoints
```typescript
// Transcript Management
POST   /api/transcripts              // Upload new transcript
GET    /api/transcripts              // List transcripts with pagination
GET    /api/transcripts/{id}         // Get specific transcript
PUT    /api/transcripts/{id}         // Update transcript metadata
DELETE /api/transcripts/{id}         // Delete transcript
GET    /api/transcripts/{id}/versions // Get version history

// Processing Operations
POST   /api/transcripts/{id}/process // Trigger processing pipeline
GET    /api/transcripts/{id}/status  // Get processing status
POST   /api/transcripts/{id}/reprocess // Reprocess with new options

// Search and Retrieval
GET    /api/search                   // Semantic search across transcripts
POST   /api/search/advanced          // Complex queries with filters
GET    /api/search/suggestions       // Search autocomplete

// Analysis Operations
POST   /api/analyze/topic            // Topic analysis for transcript(s)
POST   /api/analyze/speaker          // Speaker pattern analysis
POST   /api/analyze/trend            // Trend analysis across time
POST   /api/analyze/compare          // Compare multiple transcripts

// RAG and AI Operations
POST   /api/chat                     // Conversational interface
POST   /api/summarize               // Generate summaries
POST   /api/extract                 // Extract specific information
```

#### WebSocket Events (Real-time Updates)
```typescript
// Processing updates
'processing:started'   // Job started
'processing:progress'  // Progress percentage
'processing:completed' // Job finished
'processing:error'     // Job failed

// Analysis updates
'analysis:started'     // Analysis job started
'analysis:results'     // Partial results available
'analysis:completed'   // Final results ready
```

### Processing Pipeline Architecture

#### Pipeline Stages
```typescript
interface ProcessingPipeline {
  stages: [
    'format_detection',    // Identify transcript format
    'parsing',            // Extract structured content
    'normalization',      // Standardize text and metadata
    'validation',         // Schema and content validation
    'segmentation',       // Create processable segments
    'token_counting',     // Calculate token usage
    'embedding_generation', // Generate vector embeddings
    'storage',            // Store processed results
    'indexing',           // Update search indexes
    'quality_assessment'  // Validate processing quality
  ];
  
  recovery: 'restart_stage' | 'restart_pipeline' | 'manual_intervention';
  timeout_ms: number;
  retry_policy: RetryPolicy;
}
```

#### Job Queue System
```typescript
interface ProcessingJob {
  id: string;
  transcript_id: string;
  job_type: 'full_processing' | 'reprocess_embeddings' | 'update_index';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  options: ProcessingOptions;
  dependencies: string[]; // Job IDs that must complete first
  created_at: Date;
  scheduled_at?: Date;
}

interface JobQueue {
  enqueue(job: ProcessingJob): Promise<void>;
  dequeue(worker_id: string): Promise<ProcessingJob | null>;
  getStatus(job_id: string): Promise<JobStatus>;
  retryJob(job_id: string): Promise<void>;
  cancelJob(job_id: string): Promise<void>;
}
```

### Error Handling Strategy

#### Error Categories
```typescript
enum ErrorCategory {
  VALIDATION_ERROR = 'validation',      // Bad input data
  PROCESSING_ERROR = 'processing',      // Pipeline failures
  STORAGE_ERROR = 'storage',           // Database/blob issues
  EXTERNAL_API_ERROR = 'external_api', // LLM/embedding failures
  SYSTEM_ERROR = 'system',             // Infrastructure issues
  USER_ERROR = 'user'                  // User configuration issues
}

interface ErrorResponse {
  error: {
    category: ErrorCategory;
    code: string;
    message: string;
    details?: any;
    retry_after?: number;
    suggestions?: string[];
  };
  request_id: string;
  timestamp: Date;
}
```

#### Recovery Strategies
- **Validation Errors**: Immediate user feedback with correction suggestions
- **Processing Errors**: Automatic retry with exponential backoff
- **Storage Errors**: Circuit breaker pattern with fallback storage
- **External API Errors**: Queue for retry with rate limiting
- **System Errors**: Alert monitoring with graceful degradation

## Implementation Phases

### Phase 1: Foundation (P0) - Weeks 1-3
**Goal**: Reliable transcript upload, storage, and basic processing

#### Phase 1A: Core Storage (Week 1)
- [ ] Database schema implementation with migrations
- [ ] Blob storage integration with versioning
- [ ] Basic API endpoints (upload, retrieve, list)
- [ ] Error handling middleware and logging

#### Phase 1B: Format Processing (Week 2)
- [ ] Format detection and parser implementation
- [ ] Content normalization and validation
- [ ] Token counting with caching
- [ ] Processing pipeline orchestration

#### Phase 1C: Segmentation (Week 3)
- [ ] Speaker-based segmentation algorithms
- [ ] Semantic boundary detection
- [ ] Segment storage and retrieval
- [ ] Quality assessment metrics

### Phase 2: Intelligence (P1-P2) - Weeks 4-7
**Goal**: Vector embeddings, search, and basic analysis

#### Phase 2A: Embeddings (Weeks 4-5)
- [ ] OpenAI embeddings integration with batching
- [ ] Vector storage and indexing
- [ ] Speaker profile generation
- [ ] Similarity search implementation

#### Phase 2B: RAG Foundation (Weeks 6-7)
- [ ] Context retrieval engine
- [ ] Prompt assembly and formatting
- [ ] LLM service abstraction
- [ ] Basic Q&A functionality

### Phase 3: Analysis (P2-P3) - Weeks 8-12
**Goal**: Advanced analysis and insights

#### Phase 3A: Topic Analysis (Weeks 8-9)
- [ ] Topic extraction and classification
- [ ] Trend detection algorithms
- [ ] Speaker-topic associations
- [ ] Temporal pattern analysis

#### Phase 3B: Advanced Features (Weeks 10-12)
- [ ] Comparative analysis tools
- [ ] Advanced visualization support
- [ ] Export and reporting functionality
- [ ] Performance optimization

### Phase 4: Enhancement (P3+) - Weeks 13+
**Goal**: Advanced features and optimization

- [ ] Real-time processing
- [ ] Advanced AI features
- [ ] Integration APIs
- [ ] Scalability improvements

## Success Metrics

### Technical Metrics
- **Upload Success Rate**: >99.5%
- **Processing Latency**: <30s for 10MB transcript
- **Search Response Time**: <500ms for semantic queries
- **System Uptime**: >99.9%
- **Error Recovery Rate**: >95% automatic resolution

### Quality Metrics
- **Parsing Accuracy**: >98% for supported formats
- **Speaker Attribution**: >95% accuracy
- **Search Relevance**: >90% user satisfaction
- **Analysis Accuracy**: Validated against manual review

### Performance Metrics
- **Concurrent Users**: Support 100+ simultaneous users
- **Storage Efficiency**: <2x original file size including indexes
- **API Throughput**: 1000+ requests/minute
- **Cost Efficiency**: <$0.10 per transcript processed

## Risk Assessment & Mitigation

### Technical Risks
1. **Vector Database Performance**: Mitigation with proper indexing and query optimization
2. **LLM API Rate Limits**: Mitigation with queuing, caching, and multiple providers
3. **Large File Processing**: Mitigation with streaming, chunking, and progress tracking
4. **Data Consistency**: Mitigation with transactional operations and eventual consistency patterns

### Business Risks
1. **Accuracy Requirements**: Mitigation with extensive testing and human validation loops
2. **Privacy Concerns**: Mitigation with data anonymization and access controls
3. **Scalability Needs**: Mitigation with cloud-native architecture and monitoring
4. **Integration Complexity**: Mitigation with well-defined APIs and documentation

## Next Steps

1. **Review and Validate Architecture**: Ensure all stakeholders align on technical direction
2. **Create Detailed Issue Breakdown**: Convert this plan into specific, implementable GitHub issues
3. **Set Up Development Environment**: Database, services, and testing infrastructure
4. **Begin Phase 1A Implementation**: Start with core storage and API foundation

This architecture provides a clear, implementable roadmap from current state to full AI-powered transcript analysis system.