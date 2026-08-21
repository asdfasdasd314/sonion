# Graph Report - sonion  (2026-08-20)

## Corpus Check
- 53 files · ~20,209 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 429 nodes · 762 edges · 24 communities (18 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9c7a946`
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
- tools.ts
- Gemini model selection
- USDA food-data tools
- nutrition-targets.tsx
- normalize.ts
- Client-only nutrition dashboard
- Portion Unit meal estimation

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `NormalizedFood` - 11 edges
3. `estimateMeal()` - 11 edges
4. `scripts` - 11 edges
5. `POST()` - 10 edges
6. `buildFoodIndex()` - 10 edges
7. `parseAgentResponse()` - 9 edges
8. `runLoop()` - 9 edges
9. `normalizeFood()` - 9 edges
10. `fieldDiagnostic()` - 8 edges

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
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 2 - "Next.js Dependencies"
Cohesion: 0.07
Nodes (27): @google/genai, next, dependencies, @google/genai, next, react, react-dom, tsx (+19 more)

### Community 3 - "Project Agent Rules"
Cohesion: 0.09
Nodes (44): checkEnvelopeKeys(), DEFAULT_PROTOCOL_LIMITS, diagnostic(), duplicateTopLevelKeys(), fieldDiagnostic(), formatProtocolErrors(), formatResult(), formatToolCall() (+36 more)

### Community 4 - "TypeScript References"
Cohesion: 0.08
Nodes (52): FoodDataSetupError, asRecord(), buildAndWriteFoodIndex(), buildFoodIndex(), compareText(), extractRecords(), FNDDS_DATA_PATH, FOOD_DATA_DIR (+44 more)

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
Cohesion: 0.09
Nodes (33): errorResponse(), isPromptBody(), POST(), PromptBody, Home(), AuthMode, AuthPanel(), AuthPanelProps (+25 more)

### Community 18 - "tools.ts"
Cohesion: 0.12
Nodes (31): formatValue(), MealInterpreter(), MealInterpreterProps, selectPreferredVolumePortion(), loadParameters(), MEAL_ESTIMATION_PARAMETERS, MealEstimationParameters, parameterValue() (+23 more)

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
Cohesion: 0.15
Nodes (26): finiteNumber(), ingredientDescription(), normalizedUnit(), normalizeFood(), normalizeIngredients(), normalizePortion(), normalizePortions(), NUTRIENT_IDS (+18 more)

### Community 23 - "Client-only nutrition dashboard"
Cohesion: 0.29
Nodes (6): Client-only nutrition dashboard, Dev Mode, Key Points, Relevant Files, State Log, Summary

### Community 24 - "Portion Unit meal estimation"
Cohesion: 0.29
Nodes (6): Dev Mode, Key Points, Portion Unit meal estimation, Relevant Files, State Log, Summary

## Knowledge Gaps
- **151 isolated node(s):** `PromptBody`, `geistSans`, `geistMono`, `metadata`, `AuthMode` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NormalizedFood` connect `TypeScript References` to `Project Agent Rules`, `Home Page`, `tools.ts`, `normalize.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `FoodDataSetupError` connect `TypeScript References` to `Home Page`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Linting and Styling` to `Next.js Dependencies`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `PromptBody`, `geistSans`, `geistMono` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TypeScript Compiler Options` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Linting and Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Next.js Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._