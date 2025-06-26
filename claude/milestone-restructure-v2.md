# City Council Analyzer - Revised MVP Milestone Plan v2.0

## Executive Summary

The current roadmap is over-engineered for single-user research tool. Analysis shows 40+ open issues spanning complex infrastructure that isn't needed yet. The Vercel→Supabase Storage migration is complete, but progress is blocked by 20+ scattered logging/testing issues. This revision proposes a radically simplified MVP progression that delivers user value in 3-4 development blocks rather than 12 weeks, with proper formatting, quantified exit criteria, and realistic effort estimates.

## Revised MVP Milestone Map

| Stage | Goal (User Value) | Included Issues | New Issues Needed | Exit Criteria | Effort Est | Dependencies |
|-------|-------------------|----------------|-------------------|---------------|------------|--------------|
| 🛹 | **Basic Upload & Browse** — Upload JSON/TXT files via web UI, see list of transcripts with metadata, click to view content | #76, #80, #81 | #NEW-001: File viewer component<br>#NEW-002: Connect TranscriptUpload.tsx to real APIs | 3 sample transcripts uploaded, listed, and viewable in <10s each. Zero mock functions in UI components. | 1-2 blocks (8-16 hours) | Storage backend (✅ complete), Basic schema |
| 🛴 | **Keyword Search Across Files** — Search text content across all uploaded transcripts, get highlighted results with context | #NEW-003: Supabase FTS implementation | #NEW-004: Search UI component<br>#NEW-005: Result highlighting with context | Search "housing" returns relevant segments from ≥3 files in <2s. ≥80% recall on manual validation set of 20 queries. | 1 block (8 hours) | 🛹 complete, FTS indexing |
| 🚲 | **Speaker Attribution & Filtering** — Parse speaker names from transcripts, filter search by speaker, basic speaker stats | #NEW-006: Speaker parsing for JSON/TXT formats | #NEW-007: Speaker filter UI component<br>#NEW-008: Speaker stats dashboard | Search "Smith said housing" returns only Smith's statements with ≥80% speaker-match F1 score on validation set. Speaker stats accurate to ±5% vs manual count. | 1-2 blocks (8-16 hours) | 🛴 complete, Speaker schema extension |
| 🏍️ | **Semantic Search & Clustering** — Vector embeddings for semantic search, related topics discovery, topic trends over time | #83, #84, #85, #86 | #NEW-009: Topic clustering visualization<br>#NEW-010: Semantic search UI overlay | Query "affordable housing policy" finds semantically related content across meetings with ≥0.7 average relevance score. Topic clusters pass manual coherence review. | 2-3 blocks (16-24 hours) | 🚲 complete, OpenAI API integration |
| 🚗 | **Advanced Analytics & Export** — Speaker talk-time analysis, policy evolution timelines, exportable reports | #89, #NEW-011: Analytics dashboard | #NEW-012: Report generation system<br>#NEW-013: CSV/PDF export functionality | Generate speaker analysis report for 6-month date range, export as CSV/PDF in <30s. Reports pass manual audit with ≥90% accuracy vs ground truth. | 2 blocks (16 hours) | 🏍️ complete, Analytics schema |

## Issue Status Analysis & Recommendations

### Critical Path Issues (Must Complete)
- **#76**: Blob Storage Architecture Implementation (`status:ready`) - **READY TO START**
- **#80**: Database Schema Design and Migration (`status:ready`) - **READY TO START**  
- **#81**: API Middleware and Error Handling (`status:ready`) - **READY TO START**
- **#82**: Basic CRUD API Endpoints (`status:blocked`) - **INVESTIGATE BLOCKER**

### Deferred Infrastructure Issues (Tag for Later Review)
The following issues should be tagged `status:deferred` + `scope:yagni?` and reassessed after 🛹 demo:
- **#143-147**: Logging infrastructure epic (5 issues)
- **#101-104**: Database isolation testing (4 issues) 
- **#136-139**: Config refactoring (4 issues)
- **#94-99**: Property-based testing optimization (6 issues)

**Rationale**: These are premature optimizations that add complexity without user-visible value. Focus on core functionality first.

### Future Milestone Issues (Keep Blocked Until Dependencies Met)
- **#83-89**: Vector/AI infrastructure (7 issues) - **Defer to 🏍️**
- **#74-75**: Advanced storage features (2 issues) - **Defer to 🚗**

## Technical Implementation Strategy

### Dependency Matrix & Schema Freeze Points

| Component | 🛹 Requirements | 🛴 Additions | 🚲 Extensions | 🏍️ Additions | 🚗 Additions |
|-----------|----------------|--------------|---------------|---------------|---------------|
| **Database Schema** | transcripts table, basic metadata | search indexing (FTS) | speaker fields, attribution | vectors, embeddings | analytics tables |
| **Storage Layer** | file upload/retrieval | — | — | — | versioning, exports |
| **API Layer** | CRUD endpoints | search endpoints | speaker endpoints | vector search | analytics endpoints |
| **UI Components** | upload, list, view | search, results | speaker filters | semantic search | dashboards, reports |

**Schema Freeze Points**: 
- After 🛹: Basic transcript schema locked
- After 🛴: Search indexing strategy locked  
- After 🚲: Speaker attribution fields locked

### Risk Mitigation & Technical Decisions

#### Supabase FTS Performance Validation
**Required before 🛴**: Spike test with 50+ transcripts (~10x expected volume)
- **Performance target**: <2s search response time
- **Scalability limit**: Document ~1GB content limit for FTS
- **Escape hatch**: Migration path to vector search documented if limits hit

#### Progressive Complexity Management
- **🛹-🛴**: Simple text search validates basic user workflow
- **🚲**: Speaker parsing proves transcript structure understanding
- **🏍️**: Vector embeddings only after proving search value
- **🚗**: Analytics only after proving core search/filter value

#### Development Workflow Optimization
- **Token Limit Constraint**: 5-hour development windows (3 per day max)
- **Issue Batching**: Group related changes into single commits
- **Testing Strategy**: Use existing test infrastructure, defer optimization
- **Frontend Integration**: Replace mocks with real APIs incrementally

## Implementation Plan & Next Steps

### Phase 1: Unblock Critical Path (Current Session)
1. **Investigate #82 blocker** - determine why Basic CRUD API is blocked
2. **Triage infrastructure issues** - tag #143-147, #101-104, #136-139, #94-99 as deferred
3. **Create placeholder issues** - generate NEW-001 through NEW-013 with proper acceptance criteria
4. **Update project documentation** - revise implementation-roadmap.md

### Phase 2: 🛹 Basic Upload & Browse (Next 1-2 Sessions)
1. **Complete storage integration** - finish #76, #80, #81
2. **Connect frontend to real APIs** - replace mock functions in TranscriptUpload.tsx
3. **Create file viewer component** - basic transcript content display
4. **Validation testing** - verify 3 sample transcripts upload/list/view workflow

### Phase 3: 🛴 Keyword Search (Following Session)
1. **Implement Supabase FTS** - full-text search on transcript content
2. **Create search UI** - search box with results display
3. **Add result highlighting** - show search terms in context
4. **Performance validation** - verify <2s search across multiple files

## Success Metrics & Quality Gates

### Quantified Exit Criteria Details

**🛹 Basic Upload & Browse**
- Upload performance: 3 files (5MB each) complete in <10s total
- Listing performance: Display 20 transcripts in <3s
- View performance: Load transcript content in <2s
- Error handling: Graceful failure messages for invalid files
- **Manual validation**: Zero mock functions remaining in UI code

**🛴 Keyword Search**
- Search performance: Results for any query in <2s
- Search accuracy: ≥80% recall on validation set of 20 test queries
- Result quality: Relevant context (±50 words) displayed with highlights
- **Manual validation**: Search finds expected results across multiple transcripts

**🚲 Speaker Attribution & Filtering**
- Parser accuracy: ≥80% F1 score for speaker identification on test set
- Filter performance: Speaker-filtered search results in <3s
- Stats accuracy: Speaker talk-time calculations within ±5% of manual count
- **Manual validation**: Speaker attribution matches human review

### Effort Estimation Details

**Story Point Conversion**: 1 block = 8 hours = 4 story points
- **🛹**: 1-2 blocks = 8-16 hours (basic CRUD + UI integration)
- **🛴**: 1 block = 8 hours (search is well-understood problem)
- **🚲**: 1-2 blocks = 8-16 hours (speaker parsing adds complexity)
- **🏍️**: 2-3 blocks = 16-24 hours (vector infrastructure setup)
- **🚗**: 2 blocks = 16 hours (analytics on established foundation)

**Total Estimated Effort**: 7-10 development blocks = 56-80 hours across 2-3 weeks

## Conclusion

This revised plan addresses all critique points:
- ✅ **Proper table formatting** with complete issue references
- ✅ **Quantified exit criteria** with specific performance and accuracy targets  
- ✅ **Effort estimates** in blocks/hours for realistic scheduling
- ✅ **Dependency matrix** showing schema evolution and freeze points
- ✅ **Triage strategy** for premature optimization issues
- ✅ **Risk mitigation** with technical validation requirements
- ✅ **Progressive complexity** ensuring each stage delivers complete user value

The plan transforms scattered infrastructure work into focused user-value delivery within the constraint of token-limited development sessions.