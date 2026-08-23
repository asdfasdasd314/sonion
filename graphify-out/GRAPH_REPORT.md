# Graph Report - sonion  (2026-08-22)

## Corpus Check
- 70 files · ~27,506 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 554 nodes · 1068 edges · 27 communities (21 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68818179`
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
- nutrition-targets.tsx
- normalize.ts
- Client-only nutrition dashboard
- Portion Unit meal estimation
- Supabase meal history
- config.ts

## God Nodes (most connected - your core abstractions)
1. `POST()` - 16 edges
2. `compilerOptions` - 16 edges
3. `NormalizedFood` - 11 edges
4. `estimateMeal()` - 11 edges
5. `scripts` - 11 edges
6. `parseAgentResponse()` - 10 edges
7. `buildFoodIndex()` - 10 edges
8. `MealEstimate` - 10 edges
9. `fieldDiagnostic()` - 9 edges
10. `runLoop()` - 9 edges

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

## Communities (27 total, 6 thin omitted)

### Community 0 - "TypeScript Compiler Options"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 1 - "Linting and Styling"
Cohesion: 0.07
Nodes (47): DELETE(), errorResponse(), getMealId(), mapError(), PATCH(), errorResponse(), GET(), mapError() (+39 more)

### Community 2 - "Next.js Dependencies"
Cohesion: 0.04
Nodes (44): eslint, eslint-config-next, @google/genai, next, dependencies, @google/genai, next, react (+36 more)

### Community 3 - "Project Agent Rules"
Cohesion: 0.08
Nodes (51): checkEnvelopeKeys(), DEFAULT_PROTOCOL_LIMITS, diagnostic(), duplicateTopLevelKeys(), fieldDiagnostic(), formatProtocolErrors(), formatResult(), formatRevision() (+43 more)

### Community 4 - "TypeScript References"
Cohesion: 0.08
Nodes (54): FoodDataSetupError, asRecord(), buildAndWriteFoodIndex(), buildFoodIndex(), compareText(), extractRecords(), FNDDS_DATA_PATH, FOOD_DATA_DIR (+46 more)

### Community 5 - "Architecture Profiles"
Cohesion: 0.06
Nodes (38): Architecture Agent Profile, Coding Agent Profile, Integrating Agent Profile, Planning Agent Profile, AGENTS Instructions, Feature Files, Graphify, Next.js (+30 more)

### Community 6 - "Starter App Documentation"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Relevant Files, Server-side agent tool loop, State Log, Summary

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
Cohesion: 0.17
Nodes (20): Home(), AuthMode, AuthPanel(), AuthPanelProps, AuthErrorResponse, authRequest(), AuthResponse, AuthResult (+12 more)

### Community 17 - "route.ts"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Relevant Files, State Log, Structured meal revisions, Summary

### Community 18 - "tools.ts"
Cohesion: 0.06
Nodes (61): errorResponse(), isPromptBody(), POST(), PromptBody, getFoodToolsSkill(), AlternatingModelSelector, createGemmaClient(), getGeminiModel() (+53 more)

### Community 19 - "Gemini model selection"
Cohesion: 0.29
Nodes (6): Alternating Gemini model selection, Dev Mode, Key Points, Relevant Files, State Log, Summary

### Community 20 - "USDA food-data tools"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Relevant Files, State Log, Summary, USDA food-data tools

### Community 21 - "nutrition-targets.tsx"
Cohesion: 0.08
Nodes (43): formatDate(), formatTime(), HistoryState, MacroSummary(), MealDetails(), MealDetailsProps, MealHistory(), MealHistoryProps (+35 more)

### Community 22 - "normalize.ts"
Cohesion: 0.15
Nodes (26): finiteNumber(), ingredientDescription(), normalizedUnit(), normalizeFood(), normalizeIngredients(), normalizePortion(), normalizePortions(), NUTRIENT_IDS (+18 more)

### Community 23 - "Client-only nutrition dashboard"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Relevant Files, State Log, Summary, Supabase-backed nutrition dashboard

### Community 24 - "Portion Unit meal estimation"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Portion Unit meal estimation, Relevant Files, State Log, Summary

### Community 25 - "Supabase meal history"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Relevant Files, State Log, Summary, Supabase meal history

### Community 26 - "config.ts"
Cohesion: 0.50
Nodes (4): loadParameters(), MEAL_REVISION_PARAMETERS, MealRevisionParameters, parameterValue()

## Knowledge Gaps
- **184 isolated node(s):** `PromptBody`, `geistSans`, `geistMono`, `metadata`, `AuthMode` (+179 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NormalizedFood` connect `TypeScript References` to `tools.ts`, `Project Agent Rules`, `normalize.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `MealEstimate` connect `tools.ts` to `Linting and Styling`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `getSupabaseUser()` connect `tools.ts` to `Linting and Styling`, `Home Page`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `PromptBody`, `geistSans`, `geistMono` to the rest of the system?**
  _184 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TypeScript Compiler Options` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Linting and Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.06538461538461539 - nodes in this community are weakly interconnected._
- **Should `Next.js Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._