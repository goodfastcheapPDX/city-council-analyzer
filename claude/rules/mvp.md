# Minimal Solution Approach
- **Philosophy**: Always write the minimum possible code to satisfy a requirement
- **Progression Model**: Think skateboard → scooter → bike → motorcycle → car
- **Anti-Pattern**: Avoid frame → engine → body → interior → car approach
- **Implementation**: Build the narrowest possible solution to the specific problem statement
- **Iteration**: Add complexity only when requirements explicitly demand it

## ✅ Good examples — “Always do this”
###	Situation	Minimal-first move	Why it’s a “skateboard”
1. Need to read/write transcripts in tests	Add one thin factory (createStorageForTest) that wraps the Supabase SDK and hard-codes a single path prefix for isolation. No elaborate DI, no plugin system. See real code in src/lib/storage/factories.ts. 
github.com
Gives instant value; >95 % of future changes are handled by adding options to this one helper.
2. Want users to upload council-meeting audio	Start with a single Next.js API route that accepts a local file and stores it in one bucket. Hard-code the bucket name in code comments; defer multi-bucket or S3 support until a second storage back-end is requested.	You ship an MVP in hours; storage abstraction can wait.
3. Search across transcripts	Begin with Postgres ILIKE '%keyword%' in one SQL view. No Elastic, no vector DB, no fuzzy synonyms. Add indexes only when a real query gets slow.	It’s literally a 3-line SQL view—fewer failure modes, simpler deploy.
4. Need logging	Use console.log + console.error wrapped in a one-line helper (log.ts) until you have proof you need correlation IDs or JSON sinks.	Keeps noise out of codebase; lets you observe real pain points before choosing a log stack.
5. Front-end prototype	Render a read-only HTML table of agenda items; no pagination, no sort. Improve only after a user asks to sort 200 rows.	Validates UI assumptions quickly, minimizes CSS/JS debt.

## 🚫 Bad examples — “Never do this”
###	Situation	Over-built response (what not to do)	Why it violates “Minimal Solution”
1. Same logging need as above	Create seven issues for structured logging, tracing middleware, correlation IDs, and benchmarking before a single log line exists (see open logging epics #144-#150). 
github.com
You’re designing a car before confirming you even need a scooter.
2. Transcript storage	Stand up a polyglot micro-service, abstract cloud storage behind a provider interface, add encryption key rotation—even though only one Supabase bucket is in scope.	Massive surface area, zero immediate user benefit.
3. Search feature	Integrate OpenSearch with TF-IDF + embeddings, build a React search-as-you-type component, and write Terraform modules—before you know typical query volume.	Wastes infra budget and team bandwidth; hard to undo.
4. Front-end	Introduce state machines (XState) and a plugin architecture to render transcript timelines, when the requirement is “show a list.”	High cognitive load for contributors, fragile until fully fleshed out.
5. Testing	Add full property-based testing & snapshot diffing for every component on day one, ballooning test time to 20 min, causing devs to skip tests.	Premature optimization: slows feedback loop instead of tightening it.

## Rule of thumb

Ship the skateboard that actually rolls, then decide if you really need a scooter.
If you can’t articulate a user story that breaks today, you’re probably adding the frame, engine, and body before you have wheels.

Use the above tables as a checklist when reviewing PRs: if a change falls into the “Bad” patterns, push back until there’s an explicit requirement forcing that complexity.
