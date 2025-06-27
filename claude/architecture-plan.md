# City Council Analyzer - Complete Architecture & Implementation Plan

## Project Vision

Build an AI-powered transcript analysis system that transforms city council meeting recordings into searchable, analyzable knowledge. The system enables users to:

1. **Upload** transcripts in multiple formats (JSON, text)
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

#### **1. Ingestion Layer**
- **Format Detection**: Automatic format identification
- **Multi-Format Parsers**: JSON, SRT, VTT, plain text support
- **Content Normalization**: Speaker standardization, text cleaning
- **Schema Validation**: Zod-based validation with clear error messages
- **Upload API**: RESTful endpoints with progress tracking

#### **2. Storage Layer**
- **Blob Storage**: Vercel Blob for transcript content (raw + processed)
- **Metadata Database**: Supabase for structured data and relationships
- **Versioning System**: Track transcript changes and processing history
- **Caching Layer**: Redis-compatible caching for performance

#### **3. Processing Layer**
- **Segmentation Engine**: Speaker-based and semantic boundary detection
- **Token Management**: OpenAI-compatible token counting and limits
- **Quality Assessment**: Content validation and processing metrics
- **Pipeline Orchestration**: Reliable, resumable processing workflows

#### **4. AI/ML Layer**
- **Vector Embeddings**: OpenAI embeddings with batch processing
- **Embedding Storage**: Vector database with similarity search
- **Speaker Profiling**: Aggregated speaker characteristics and patterns
- **Content Indexing**: Searchable indexes for rapid retrieval

#### **5. Analysis Layer**
- **RAG Engine**: Context retrieval and prompt assembly
- **LLM Integration**: Provider-agnostic LLM service abstraction
- **Topic Analysis**: Automated topic extraction and classification
- **Trend Detection**: Temporal analysis and pattern recognition

#### **6. Query Interface**
- **Semantic Search**: Vector similarity with metadata filtering
- **Contextual Retrieval**: Multi-faceted search with relevance ranking
- **Analysis Endpoints**: Structured queries for specific insights
- **Streaming Responses**: Real-time result delivery

## Detailed Technical Architecture

### Storage Strategy

#### Blob Storage Organization (Supabase Blob)
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