Quick Links:

- Transcript Generator: https://playground.deepgram.com/?endpoint=listen&smart_format=true&diarize=true&language=en&model=nova-3
- Local DB Dashboard: http://127.0.0.1:54323/project/default
- Remote Prod DB Dashboard: https://supabase.com/dashboard/project/znybssicqofaendbrnbt/database/tables
- Github Repo: https://github.com/goodfastcheapPDX/city-council-analyzer

---

## City Council Analyzer

City Council Analyzer turns raw city-council meeting recordings into searchable, analyzable knowledge for policy researchers and civic technologists.

### What it does

1. **Ingest** – Upload transcripts in common formats (TXT, JSON, VTT, SRT).
2. **Normalize & Store** – Clean, unify, and persist text plus metadata in Supabase.
3. **Explore** – Browse transcripts, run full-text or semantic search, and filter by speaker.
4. **Analyze** – Track topic trends, speaker activity, and policy evolution over time.
5. **Export** – Generate shareable CSV/PDF reports for external stakeholders (planned).

### Why it matters

Researchers spend hours scrubbing through video or PDF minutes to answer simple questions like *“Who supported the rental ordinance?”* or *“How has ‘traffic safety’ rhetoric changed since 2023?”* City Council Analyzer short-circuits that pain, delivering answers in seconds and freeing time for higher-level analysis.

### MVP roadmap (Henrik Kniberg thin slices)

| Stage                                                                          | Deliverable (thin but complete) |
| ------------------------------------------------------------------------------ | ------------------------------- |
| 🛹 **Basic Upload & Browse** – Centralized repository + reader UI              |                                 |
| 🛴 **Keyword Search** – Fast cross-file Ctrl-F with highlighted snippets       |                                 |
| 🚲 **Speaker Attribution** – “Who said what” filters and basic talk-time stats |                                 |
| 🏍️ **Semantic Discovery** – Vector search, topic clustering, trend charts     |                                 |
| 🚗 **Analytics & Reporting** – One-click CSV/PDF exports and dashboards        |                                 |

Each stage is production-deployable, adds clear user value, and locks the underlying schema before scaling complexity.

### Core tech stack

* **Next.js / TypeScript** – frontend + API routes
* **Supabase** – Postgres storage, file buckets, full-text search
* **OpenAI embeddings** – semantic search & clustering (from 🏍️ onward)
* **Docker + GitHub Actions** – reproducible local dev and CI

### Getting started

```bash
# Clone & install
git clone https://github.com/city-council-analyzer.git
cd city-council-analyzer
pnpm install

# Local dev
npx supabase start   # launches local Postgres + storage
npm run dev              # starts Next.js app at http://localhost:3000
```

Configure environment variables in `.env.local` (see `.env.example`).

### Contributing

We operate by “small, safe steps.” Pick an open issue tagged **`scope:🛹`** or **`help-wanted`**, follow the coding guidelines in `CONTRIBUTING.md`, and open a PR. All code is auto-tested and peer-reviewed before merge.

---

*Questions or feedback? Open an issue or ping @joseph-emerson in the discussions board.*


# Big-picture scale
Think of the full City Council Analyzer vision as 100 units of researcher value (rich semantic insights, policy-evolution analytics, shareable reports). Each milestone unlocks a larger—but still bounded—slice of that pie:

| Stage                                  | % of Full Vision Reachable              | What you *can* reliably do                                                                                                                                    | What you’ll still *struggle* to do                                                                                                  |
| -------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **🛹 Basic Upload & Browse**           | **≈ 10 %** – mere visibility            | • Keep transcripts in one place<br>• Skim in a convenient reader<br>• Spot obvious keywords manually                                                          | ✘ No search across files<br>✘ No speaker context<br>✘ No metrics or graphs                                                          |
| **🛴 Keyword Search**                  | **≈ 25 %** – quick recall tool          | • Find every mention of “housing” in seconds<br>• Build ad-hoc reading lists by query<br>• Triage which meetings merit deeper review                          | ✘ Synonyms/semantic drift missed (“affordable units”)<br>✘ No speaker filters or time trends<br>✘ Still manual copy-paste for notes |
| **🚲 Speaker Attribution & Filtering** | **≈ 45 %** – basic guard-rail analytics | • Ask “What did Commissioner Smith say about fees?”<br>• Get rough talk-time stats per speaker<br>• Filter noise from public-comment segments                 | ✘ Attribution errors \~20 %: need spot checks<br>✘ No clustering of topics or related phrases<br>✘ No exportable charts/reports     |
| **🏍️ Semantic Search & Clustering**   | **≈ 70 %** – thematic discovery engine  | • Surface meetings discussing a concept even if phrased differently<br>• See related-topic clusters and emerging themes<br>• Begin longitudinal term tracking | ✘ Relevance/cluster coherence not bullet-proof—human validation still needed<br>✘ No polished dashboards<br>✘ No shareable exports  |
| **🚗 Advanced Analytics & Export**     | **≈ 90 %** – decision-support suite     | • Auto-generate speaker influence reports, policy-evolution timelines, CSV/PDF hand-outs<br>• Hand data to colleagues without extra scripting                 | ✘ Remaining 10 % = polish: fine-grained accuracy, live-update pipelines, multi-user auth, large-scale performance hardening         |

(Percentages are directional—meant to reset expectations, not to be audited.)

## How to interpret these stages in practice:
- 🛹 acts like Dropbox + reader. Great for collecting material, not for research depth.
- 🛴 becomes your Ctrl-F across months of meetings. Bias toward speed; don’t over-interpret recall rates.
- 🚲 lets you answer “who said what,” but accept that attribution noise can still skew quantitative claims.
- 🏍️ finally supports exploration—“show me other things like this.” Use it for hypothesis generation, not final stats.
- 🚗 is where you’re comfortable citing numbers in a memo without tediously double-checking every figure.