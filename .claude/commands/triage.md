> **Minimalism Guard**  
> If the triage plan or label changes would exceed **25 % of the complexity budget**  
> (► 0 new LOC, ► 0 new dependencies, ► 0 new cloud services) **or** violates any MVP/YAGNI Gate,  
> **STOP**. Ask which issues to drop or defer before proceeding.

---

## Command Usage
```bash
/mvp_triage $ARGUMENT
# examples
/mvp_triage 174
# or
/mvp_triage #174
```

## Purpose
Mercilessly audit GitHub issues against the skateboard‑first roadmap. Anything that does **not** clearly advance the MVP is ruthlessly deferred or flagged `scope:yagni?`.

## Pre‑Flight Checklist
1. **Read Core Rules**: `./claude/rules/mvp.md` (non‑negotiable).
2. **Project Context**: Load `implementation-roadmap.md`, `architecture-plan.md`, any `docs/` planning files.
3. **Issue Set**:
   ```bash
   BASE=$(echo "$1" | sed 's/#//')
   gh issue list --state open --json number,title,labels,body --jq '.[]' > .github-issues/all_issues.json
   gh issue query "mentions:$BASE" --json number > .github-issues/related.json  # fallback to grep if query unsupported
   ```

## Triage Algorithm
1. **Relation Sweep** – Build a superset of issues that:
   * direct‑link or mention `BASE`
   * are blocked by / blocking `BASE`
   * share milestone or epic with `BASE`
2. **For EACH candidate issue**
   1. **Explainability Test** – Can you justify the issue to a junior engineer in **≤ 1 sentence**?  
      *If not, mark ⇒ `scope:yagni?` and skip further scoring.*
   2. **Stage Mapping** – Assign 🛹 (skateboard), 🛴, 🚲, 🏍️, 🚗 based on earliest release phase it supports.
   3. **Value ⇆ Complexity** – Rate **High / Medium / Low**. Poor ratio ⇒ consider defer/YAGNI.
   4. **Decision** – `KEEP NOW` | `DEFER` | `scope:yagni?`.
3. **Label Enforcement** – Apply / remove `scope:yagni?` via GitHub CLI:
   ```bash
   gh issue edit <num> --add-label "scope:yagni?"
   ```
4. **Output Report** – Emit markdown:
   ```markdown
   ## MVP‑Focused Triage Report (anchor: #<BASE>)

   ### 🛹 MVP‑Critical
   | Issue | Stage | Value | Rationale |
   |-------|-------|-------|-----------|
   
   ### ⏳ Deferred
   | Issue | Reason |
   |-------|--------|
   
   ### 🔥 YAGNI (flagged)
   | Issue | Why Flagged |
   |-------|------------|

   **Labels added:** #12, #34  
   **Labels removed:** #56

   **Recommendations**
   - Bullet 1 (merge X into Y)
   - Bullet 2 (close Z as duplicate of Q)
   - … (max 5 bullets)
   ```

## Troubleshooting Guide
* **No related issues found** – Output tables with "(none)" rows; still evaluate `BASE`.
* **GitHub API limits** – Fallback to local `git grep -i "#<BASE>"` across `.md` & `.ts` files.
* **Missing roadmap** – Note absence, proceed, but add TODO to create roadmap doc.
* **Large issue set (>100)** – Process only related subset + 50 highest‑priority backlog items (labelled P0‑P2).

## Success Criteria
* All YAGNI candidates bear `scope:yagni?`.
* Report delivered in <60 s wall clock.
* No action taken outside labeling & reporting.
