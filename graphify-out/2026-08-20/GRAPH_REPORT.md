# Graph Report - sonion  (2026-08-20)

## Corpus Check
- 31 files · ~9,370 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 259 nodes · 386 edges · 21 communities (15 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2aa264ea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TypeScript Compiler Options
- Linting and Styling
- Next.js Dependencies
- Project Agent Rules
- TypeScript References
- Architecture Profiles
- Starter App Documentation
- Repository Instructions
- App Layout
- Bridge Profile
- Home Page
- ESLint Configuration
- Next Configuration
- PostCSS Configuration
- File Icon Asset
- Globe Icon Asset
- Window Icon Asset
- route.ts
- tools.ts
- Gemini model selection
- USDA food-data tools

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `buildFoodIndex()` - 10 edges
3. `normalizeFood()` - 9 edges
4. `POST()` - 7 edges
5. `createFoodTools()` - 7 edges
6. `NormalizedFood` - 7 edges
7. `scripts` - 7 edges
8. `include` - 7 edges
9. `finiteNumber()` - 6 edges
10. `normalizePortion()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Next.js` --semantically_similar_to--> `Next.js Wordmark SVG`  [INFERRED] [semantically similar]
  README.md → public/next.svg
- `Vercel Platform` --semantically_similar_to--> `Vercel Triangle SVG`  [INFERRED] [semantically similar]
  README.md → public/vercel.svg
- `Graphify` --semantically_similar_to--> `Graphify`  [INFERRED] [semantically similar]
  AGENTS.md → .agents/profiles/architecture.md
- `Feature Files` --semantically_similar_to--> `Feature Files`  [INFERRED] [semantically similar]
  AGENTS.md → .agents/profiles/coding.md
- `Parameter Files` --semantically_similar_to--> `Parameter Files`  [INFERRED] [semantically similar]
  AGENTS.md → .agents/profiles/coding.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Standalone TUI Boundary Across Project Instructions** — _agents_profiles_architecture, _agents_profiles_coding, _agents_profiles_integrating, _agents_profiles_planning, agents, claude [EXTRACTED 1.00]
- **Feature and Parameter File Workflow** — _agents_profiles_architecture, _agents_profiles_coding, _agents_profiles_integrating, _agents_profiles_planning, agents, claude [EXTRACTED 1.00]
- **Next.js Starter Project Assets** — readme, public_next, public_vercel, public_file, public_globe, public_window [INFERRED 0.85]

## Communities (21 total, 6 thin omitted)

### Community 0 - "TypeScript Compiler Options"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 1 - "Linting and Styling"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 2 - "Next.js Dependencies"
Cohesion: 0.08
Nodes (23): @google/genai, next, dependencies, @google/genai, next, react, react-dom, tsx (+15 more)

### Community 3 - "Project Agent Rules"
Cohesion: 0.12
Nodes (18): Architecture Agent Profile, Coding Agent Profile, Integrating Agent Profile, AGENTS Instructions, Feature Files, Graphify, Parameter Files, Four Stage Development Lifecycle (+10 more)

### Community 4 - "TypeScript References"
Cohesion: 0.14
Nodes (25): asRecord(), buildAndWriteFoodIndex(), buildFoodIndex(), compareText(), extractRecords(), FNDDS_DATA_PATH, FOOD_DATA_DIR, FOUNDATION_DATA_PATH (+17 more)

### Community 5 - "Architecture Profiles"
Cohesion: 0.12
Nodes (20): Planning Agent Profile, Next.js, Feature Files, Graphify Planning Evidence, CLAUDE Instructions, Feature Files, Graphify, Next.js (+12 more)

### Community 6 - "Starter App Documentation"
Cohesion: 0.20
Nodes (20): finiteNumber(), ingredientDescription(), normalizeFood(), normalizeIngredients(), normalizePortion(), normalizePortions(), NUTRIENT_IDS, nutrientAmount() (+12 more)

### Community 7 - "Repository Instructions"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Relevant Files, State Log, Summary, Supabase email/password authentication

### Community 8 - "App Layout"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 9 - "Bridge Profile"
Cohesion: 0.50
Nodes (4): Bridge Agent Profile, Answer Oriented Programming, Coding Readiness, Centralized Project Document cp_doc

### Community 10 - "Home Page"
Cohesion: 0.15
Nodes (22): ApiPayload, Home(), AuthMode, AuthPanel(), AuthPanelProps, AuthErrorResponse, authRequest(), AuthResponse (+14 more)

### Community 17 - "route.ts"
Cohesion: 0.24
Nodes (10): errorResponse(), isPromptBody(), POST(), PromptBody, createGemmaClient(), getGemmaModel(), getGemmaSystemInstruction(), getSupabaseUser() (+2 more)

### Community 18 - "tools.ts"
Cohesion: 0.19
Nodes (19): RUNTIME_INDEX_PATH, getLoadedFoodById(), isNormalizedFood(), loadFoodIndex(), compareText(), createFoodTools(), FoodToolset, getDefaultTools() (+11 more)

### Community 19 - "Gemini model selection"
Cohesion: 0.29
Nodes (6): Dev Mode, Gemini model selection, Key Points, Relevant Files, State Log, Summary

### Community 20 - "USDA food-data tools"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Relevant Files, State Log, Summary, USDA food-data tools

## Knowledge Gaps
- **101 isolated node(s):** `PromptBody`, `geistSans`, `geistMono`, `metadata`, `ApiPayload` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Linting and Styling` to `Next.js Dependencies`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `AGENTS Instructions` connect `Project Agent Rules` to `Architecture Profiles`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `buildFoodIndex()` (e.g. with `normalizeFnddsFood()` and `normalizeFoundationFood()`) actually correct?**
  _`buildFoodIndex()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PromptBody`, `geistSans`, `geistMono` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TypeScript Compiler Options` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Linting and Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Next.js Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._