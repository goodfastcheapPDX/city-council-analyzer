# Implementation Roadmap v2.0 - MVP-Focused Milestone Approach

## Overview
This document replaces the previous complex phase-based approach with a simplified MVP milestone structure focused on delivering user value incrementally. Based on critique and analysis of the current project state, this approach prioritizes immediate user needs over infrastructure complexity.

## Current State Analysis

### ✅ Completed Infrastructure
- **Supabase Storage Migration**: Complete replacement of Vercel Blob with Supabase Storage
- **Database Schema**: Basic transcript storage and metadata management
- **API Foundation**: Working upload/list endpoints with real storage integration
- **Testing Infrastructure**: Dependency injection pattern, realistic test environments

### 🚫 Deferred Infrastructure (Tagged `scope:yagni?`)
The following 18 issues have been tagged as premature optimization:
- **Logging Infrastructure**: Issues #143-147 (5 issues)
- **Database Isolation**: Issues #101-104 (4 issues)  
- **Config Refactoring**: Issues #136-139 (4 issues)
- **Property-Based Testing Optimization**: Issues #94-99 (6 issues)

**Rationale**: These represent infrastructure complexity that doesn't deliver immediate user value for a single-user research tool.

### ✅ Unblocked Critical Path
- **Issue #82**: Basic CRUD API Endpoints - now `status:ready` (dependencies #76, #80, #81 are ready)

## Revised Milestone Structure

### 🛹 Skateboard - Basic Upload & Browse
**Goal**: Upload JSON/TXT files via web UI, see list of transcripts, view content  
**User Value**: Replace manual file management with organized transcript library

#### Critical Path Issues
- **#76**: Blob Storage Architecture Implementation (`status:ready`)
- **#80**: Database Schema Design and Migration (`status:ready`)
- **#81**: API Middleware and Error Handling (`status:ready`)
- **#82**: Basic CRUD API Endpoints (`status:ready`)

#### New Issues Created
- **#154**: File viewer component for transcript content display
- **#155**: Connect TranscriptUpload.tsx to real API endpoints

**Exit Criteria**: 3 sample transcripts uploaded, listed, and viewable in <10s each. Zero mock functions in UI.  
**Effort Estimate**: 1-2 development blocks (8-16 hours)  
**Dependencies**: Storage backend (✅ complete), Basic schema

---

### 🛴 Scooter - Keyword Search Across Files  
**Goal**: Search text content across all uploaded transcripts with highlighted results  
**User Value**: Find specific discussions or topics across meeting archives

#### New Issues Created
- **#156**: Supabase full-text search implementation
- **#157**: Search interface component with results display  
- **#158**: Result highlighting with context display

**Exit Criteria**: Search "housing" returns relevant segments from ≥3 files in <2s. ≥80% recall on manual validation set.  
**Effort Estimate**: 1 development block (8 hours)  
**Dependencies**: 🛹 complete, FTS indexing

---

### 🚲 Bicycle - Speaker Attribution & Filtering
**Goal**: Parse speaker names, filter search by speaker, basic speaker stats  
**User Value**: Track who said what, analyze speaker participation patterns

#### Issues To Be Created
- **NEW-006**: Speaker parsing for JSON/TXT formats
- **NEW-007**: Speaker filter UI component
- **NEW-008**: Speaker stats dashboard

**Exit Criteria**: Search "Smith said housing" returns only Smith's statements with ≥80% speaker-match F1 score.  
**Effort Estimate**: 1-2 development blocks (8-16 hours)  
**Dependencies**: 🛴 complete, Speaker schema extension

---

### 🏍️ Motorcycle - Semantic Search & Clustering
**Goal**: Vector embeddings for semantic search, topic discovery, trend analysis  
**User Value**: Find related discussions even with different terminology

#### Existing Issues (Currently Blocked)
- **#83**: Vector Database Setup and Configuration
- **#84**: OpenAI Embeddings Integration
- **#85**: Segment Embedding Generation
- **#86**: Vector Similarity Search Implementation

#### Issues To Be Created
- **NEW-009**: Topic clustering visualization
- **NEW-010**: Semantic search UI overlay

**Exit Criteria**: Query "affordable housing policy" finds semantically related content with ≥0.7 relevance score.  
**Effort Estimate**: 2-3 development blocks (16-24 hours)  
**Dependencies**: 🚲 complete, OpenAI API integration

---

### 🚗 Car - Advanced Analytics & Export
**Goal**: Speaker analysis, policy evolution timelines, exportable reports  
**User Value**: Generate research reports and data exports for advocacy work

#### Existing Issues
- **#89**: Analysis API Endpoints (currently blocked)

#### Issues To Be Created  
- **NEW-011**: Analytics dashboard
- **NEW-012**: Report generation system
- **NEW-013**: CSV/PDF export functionality

**Exit Criteria**: Generate speaker analysis report for date range, export as CSV/PDF in <30s with ≥90% accuracy.  
**Effort Estimate**: 2 development blocks (16 hours)  
**Dependencies**: 🏍️ complete, Analytics schema

## Technical Strategy

### Schema Evolution & Freeze Points
| Component | 🛹 Foundation | 🛴 Additions | 🚲 Extensions | 🏍️ Additions | 🚗 Additions |
|-----------|---------------|--------------|---------------|---------------|---------------|
| **Database** | transcripts table | FTS indexing | speaker fields | vector columns | analytics tables |
| **Storage** | file upload/retrieval | — | — | — | exports/reports |
| **APIs** | CRUD endpoints | search endpoints | speaker endpoints | vector search | analytics endpoints |
| **UI** | upload, list, view | search, results | speaker filters | semantic search | dashboards |

**Freeze Points**: Basic schema after 🛹, search strategy after 🛴, speaker model after 🚲

### Performance Validation Requirements

#### Supabase FTS Spike (Required Before 🛴)
- **Test Dataset**: 50+ transcripts (~10x expected volume)
- **Performance Target**: <2s search response time
- **Scalability Documentation**: ~1GB content limit for FTS
- **Escape Hatch**: Migration path to vector search if limits hit

#### Progressive Risk Management
- **🛹-🛴**: Validate text search before investing in vector infrastructure
- **🚲**: Prove speaker parsing before semantic analysis
- **🏍️**: Demonstrate search value before advanced analytics
- **🚗**: Only build reporting after core workflows proven

### Development Workflow Optimization

#### Token Limit Constraints
- **5-hour development windows**: 3 blocks per day maximum
- **Issue Batching**: Group related changes into single commits
- **Milestone Focus**: Complete each stage fully before proceeding

#### Immediate Next Steps (Current Session)
1. ✅ **Triage Complete**: Deferred 18 premature optimization issues
2. ✅ **Critical Path Unblocked**: Issue #82 now `status:ready`
3. ✅ **Placeholder Issues Created**: #154-158 for 🛹 and 🛴 milestones
4. 🔄 **Ready to Start**: Issues #76, #80, #81, #82 for 🛹 implementation

## Success Metrics

### Quantified Exit Criteria

**🛹 Upload Performance**
- File upload: 3 files (5MB each) in <10s total
- Listing: 20 transcripts displayed in <3s
- Viewing: Content load in <2s
- Integration: Zero mock functions in production UI

**🛴 Search Performance**  
- Query response: <2s for any search across 20+ files
- Search accuracy: ≥80% recall on 20-query validation set
- Context quality: Relevant ±50 word snippets with highlighting

**🚲 Speaker Attribution**
- Parser accuracy: ≥80% F1 score on speaker identification
- Filter speed: Speaker-filtered results in <3s
- Stats accuracy: Talk-time within ±5% of manual count

### Quality Gates
- **Manual Validation**: Each milestone tested with real council transcript data
- **Performance Benchmarks**: Automated performance testing for API response times
- **User Acceptance**: Each stage must demonstrate clear improvement in research workflow

## Migration from Legacy Roadmap

### Issue Status Changes
- **18 issues deferred**: Tagged `status:deferred` + `scope:yagni?`
- **4 issues unblocked**: Critical path (#76, #80, #81, #82) now ready
- **5 new issues created**: Foundation for 🛹 and 🛴 milestones
- **40+ issues remain**: Most moved to 🏍️/🚗 for later evaluation

### Documentation Updates
- **This document**: Replaces `claude/implementation-roadmap.md` as primary reference
- **Milestone tracking**: GitHub Projects configured with new milestone structure
- **work-journal.md**: Updated to reflect new priorities and approach

## Conclusion

This revised roadmap transforms a 48-issue, 12-week complex infrastructure project into a focused 5-milestone user-value delivery system. Each milestone represents a complete, usable improvement to the research workflow, with built-in validation points and escape hatches for technical decisions.

The approach respects the constraint of token-limited development sessions while ensuring each stage delivers measurable value to the primary user (single researcher doing city council advocacy work).

**Total Estimated Effort**: 7-10 development blocks (56-80 hours) across 2-3 weeks  
**First Milestone Target**: 🛹 complete within next 1-2 development sessions