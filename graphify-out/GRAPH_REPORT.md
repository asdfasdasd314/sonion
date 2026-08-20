# Graph Report - sonion  (2026-08-20)

## Corpus Check
- 21 files · ~6,111 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 173 nodes · 197 edges · 19 communities (13 shown, 6 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f2d6794c`
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
- Gemini model selection

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `POST()` - 7 edges
3. `include` - 7 edges
4. `Supabase email/password authentication` - 6 edges
5. `Gemini model selection` - 6 edges
6. `Architecture Agent Profile` - 6 edges
7. `AGENTS Instructions` - 6 edges
8. `CLAUDE Instructions` - 6 edges
9. `Project README` - 6 edges
10. `authRequest()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Next.js` --semantically_similar_to--> `Next.js Wordmark SVG`  [INFERRED] [semantically similar]
  README.md → public/next.svg
- `Vercel Platform` --semantically_similar_to--> `Vercel Triangle SVG`  [INFERRED] [semantically similar]
  README.md → public/vercel.svg
- `Next.js` --semantically_similar_to--> `Next.js`  [INFERRED] [semantically similar]
  AGENTS.md → README.md
- `Graphify` --semantically_similar_to--> `Graphify`  [INFERRED] [semantically similar]
  AGENTS.md → .agents/profiles/architecture.md
- `Feature Files` --semantically_similar_to--> `Feature Files`  [INFERRED] [semantically similar]
  AGENTS.md → .agents/profiles/coding.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Standalone TUI Boundary Across Project Instructions** — _agents_profiles_architecture, _agents_profiles_coding, _agents_profiles_integrating, _agents_profiles_planning, agents, claude [EXTRACTED 1.00]
- **Feature and Parameter File Workflow** — _agents_profiles_architecture, _agents_profiles_coding, _agents_profiles_integrating, _agents_profiles_planning, agents, claude [EXTRACTED 1.00]
- **Next.js Starter Project Assets** — readme, public_next, public_vercel, public_file, public_globe, public_window [INFERRED 0.85]

## Communities (19 total, 6 thin omitted)

### Community 0 - "TypeScript Compiler Options"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 1 - "Linting and Styling"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 2 - "Next.js Dependencies"
Cohesion: 0.11
Nodes (17): @google/genai, next, dependencies, @google/genai, next, react, react-dom, name (+9 more)

### Community 3 - "Project Agent Rules"
Cohesion: 0.20
Nodes (11): Coding Agent Profile, Integrating Agent Profile, AGENTS Instructions, Feature Files, Parameter Files, Debugging Evidence, Feature Files, Parameter Files (+3 more)

### Community 4 - "TypeScript References"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

### Community 5 - "Architecture Profiles"
Cohesion: 0.11
Nodes (18): Architecture Agent Profile, Planning Agent Profile, Graphify, Next.js, Four Stage Development Lifecycle, Feature Files, Graphify, Parameter Files (+10 more)

### Community 6 - "Starter App Documentation"
Cohesion: 0.31
Nodes (9): Next.js Wordmark SVG, Vercel Triangle SVG, Project README, app/page.tsx, create-next-app, Geist Font, next/font, Next.js (+1 more)

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

### Community 19 - "Gemini model selection"
Cohesion: 0.29
Nodes (6): Dev Mode, Gemini model selection, Key Points, Relevant Files, State Log, Summary

## Knowledge Gaps
- **82 isolated node(s):** `PromptBody`, `geistSans`, `geistMono`, `metadata`, `ApiPayload` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Linting and Styling` to `Next.js Dependencies`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `AGENTS Instructions` connect `Project Agent Rules` to `Architecture Profiles`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Next.js` connect `Architecture Profiles` to `Project Agent Rules`, `Starter App Documentation`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `PromptBody`, `geistSans`, `geistMono` to the rest of the system?**
  _82 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TypeScript Compiler Options` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Linting and Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Next.js Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._