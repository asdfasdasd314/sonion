# Graph Report - sonion  (2026-08-20)

## Corpus Check
- 47 files · ~17,466 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 380 nodes · 636 edges · 24 communities (18 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `728b5baa`
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `scripts` - 11 edges
3. `buildFoodIndex()` - 10 edges
4. `runLoop()` - 9 edges
5. `normalizeFood()` - 9 edges
6. `POST()` - 8 edges
7. `diagnostic()` - 8 edges
8. `parseToolResponse()` - 8 edges
9. `parseResultResponse()` - 8 edges
10. `createFoodToolRegistry()` - 8 edges

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

## Communities (24 total, 6 thin omitted)

### Community 0 - "TypeScript Compiler Options"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 1 - "Linting and Styling"
Cohesion: 0.06
Nodes (31): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+23 more)

### Community 2 - "Next.js Dependencies"
Cohesion: 0.15
Nodes (13): @google/genai, next, dependencies, @google/genai, next, react, react-dom, tsx (+5 more)

### Community 3 - "Project Agent Rules"
Cohesion: 0.09
Nodes (42): checkEnvelopeKeys(), DEFAULT_PROTOCOL_LIMITS, diagnostic(), duplicateTopLevelKeys(), fieldDiagnostic(), formatProtocolErrors(), formatResult(), formatToolCall() (+34 more)

### Community 4 - "TypeScript References"
Cohesion: 0.11
Nodes (33): FoodDataSetupError, asRecord(), buildAndWriteFoodIndex(), buildFoodIndex(), compareText(), extractRecords(), FNDDS_DATA_PATH, FOOD_DATA_DIR (+25 more)

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
Cohesion: 0.12
Nodes (23): Home(), AuthMode, AuthPanel(), AuthPanelProps, ApiPayload, MealInterpreterProps, AuthErrorResponse, authRequest() (+15 more)

### Community 17 - "route.ts"
Cohesion: 0.19
Nodes (12): errorResponse(), isPromptBody(), POST(), PromptBody, getFoodToolsSkill(), getDefaultFoodToolRegistry(), createGemmaClient(), getGemmaModel() (+4 more)

### Community 18 - "tools.ts"
Cohesion: 0.17
Nodes (19): compareText(), createFoodToolRegistry(), createFoodTools(), FoodToolDefinition, FoodToolName, FoodToolRegistry, FoodToolset, getDefaultTools() (+11 more)

### Community 19 - "Gemini model selection"
Cohesion: 0.29
Nodes (6): Dev Mode, Gemini model selection, Key Points, Relevant Files, State Log, Summary

### Community 20 - "USDA food-data tools"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Relevant Files, State Log, Summary, USDA food-data tools

### Community 21 - "nutrition-targets.tsx"
Cohesion: 0.10
Nodes (31): formatDate(), MealDetails(), MealHistory(), ACTIVITY_OPTIONS, FormValues, GOAL_OPTIONS, INITIAL_VALUES, NutritionTargets() (+23 more)

### Community 22 - "normalize.ts"
Cohesion: 0.20
Nodes (20): finiteNumber(), ingredientDescription(), normalizeFood(), normalizeIngredients(), normalizePortion(), normalizePortions(), NUTRIENT_IDS, nutrientAmount() (+12 more)

### Community 23 - "Client-only nutrition dashboard"
Cohesion: 0.29
Nodes (6): Client-only nutrition dashboard, Dev Mode, Key Points, Relevant Files, State Log, Summary

## Knowledge Gaps
- **138 isolated node(s):** `PromptBody`, `geistSans`, `geistMono`, `metadata`, `AuthMode` (+133 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FoodDataSetupError` connect `TypeScript References` to `route.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `NormalizedFood` connect `TypeScript References` to `tools.ts`, `Project Agent Rules`, `normalize.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `buildFoodIndex()` (e.g. with `normalizeFnddsFood()` and `normalizeFoundationFood()`) actually correct?**
  _`buildFoodIndex()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PromptBody`, `geistSans`, `geistMono` to the rest of the system?**
  _138 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TypeScript Compiler Options` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Linting and Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Project Agent Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.09158186864014801 - nodes in this community are weakly interconnected._