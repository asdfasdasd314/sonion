# Sonion

> Estimate nutrition the way humans actually think about food.

---

# Overview

Sonion is an AI-assisted nutrition tracker built for people who **don't prepare or measure their own meals**.

## Current prototype

The current slice is a prompt form backed by a Next.js route handler. It sends a food description to the configured Gemma model through a bounded server-side agent loop. The model can request read-only searches and lookups against the normalized local USDA index, but it cannot execute code or access arbitrary files, networks, or persistence. The model returns only food identity, FDC ID, Portion Unit quantity, and solid/liquid kind; the server converts those selections into the validated `{ items, totals }` estimate that the browser renders. The default model is `gemma-4-31b-it`; set `GEMINI_MODEL` in `.env.local` to use another supported model. Estimates are not persisted. Email/password authentication is connected to Supabase so future records can be scoped to individual users.

### Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. In the Supabase dashboard, create a project and copy its Project URL to `NEXT_PUBLIC_SUPABASE_URL` and its public anon key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Add a Google AI Studio API key as `GEMINI_API_KEY` in `.env.local`.
5. Start the app with `npm run dev` and open `http://localhost:3000`.

The Supabase URL and anon key are public client configuration values. Do not put a Supabase service-role key in `.env.local` or expose one to the browser. The app uses Supabase email/password auth, persists the session in the browser, and validates the bearer token on the estimate route. If email confirmation is enabled in Supabase, new users must confirm their email before signing in. The Gemini key and model setting are read only by the backend route and must not be renamed to `NEXT_PUBLIC_*` variables. If the selected model is unavailable through Google AI Studio, the app reports provider incompatibility in the UI.

Traditional nutrition apps assume users know things like:

- grams
- ounces
- tablespoons
- exact serving sizes
- exact ingredients

This works well when cooking at home.

It completely breaks down for:

- college dining halls
- restaurants
- buffets
- catered meals
- family dinners
- cafeterias
- any meal someone else prepared

Most people **know what they ate**.

Very few people know **how many grams they ate**.

Sonion bridges this gap by allowing users to describe meals naturally using intuitive Portion Units (PU), while AI interprets the food and software calculates nutrition.

The philosophy is:

> Software first.
> AI second.

The LLM interprets language.

The application performs calculations.

---

# Problem Statement

Current macro trackers create friction.

Users must constantly answer questions like:

- How many grams of chicken?
- Was that 120g or 150g?
- How many tablespoons of dressing?
- How much rice was that?

Most users have no idea.

As a result they either:

- guess random numbers
- stop tracking
- never begin tracking

This is especially problematic for college students and people eating away from home.

---

# Vision

Logging food should feel like describing what you ate to another person.

Instead of:

```
145g cooked chicken breast
173g cooked rice
42g broccoli
```

Users should be able to write:

```
2 PU grilled chicken
1 PU rice
0.5 PU broccoli
```

or

```
Mostly pasta

Some chicken

A little broccoli
```

or

```
4 PU total

60% pasta
25% chicken
15% broccoli
```

The application should understand this naturally.

---

# Goals

The MVP should:

- estimate calories
- estimate protein
- estimate carbohydrates
- estimate fat

while requiring as little effort from the user as possible.

The app is intended for:

- cutting
- bulking
- maintenance

The goal is not perfect accuracy.

The goal is to be accurate enough to guide decisions.

---

# Core Concept

## Portion Units (PU)

The primary abstraction in Sonion is the Portion Unit.

A Portion Unit is an intuitive serving amount.

Think:

> "one cafeteria scoop"

rather than

> "143 grams"

Users never need to know how many grams a PU represents.

Internally the server converts this to a calibrated volume, estimates grams from USDA or fallback density, and scales the USDA nutrient values.

The initial server-owned calibration is:

```text
solid PU = 150 mL
liquid PU = 250 mL
solid fallback density = 0.75 g/mL
liquid fallback density = 1.00 g/mL
```

These values live in `parameter_files/meal-estimation.toml` and are not accepted from the browser or model.

Examples:

```
2 PU chicken

1 PU rice

0.5 PU broccoli
```

Future versions may allow personalized calibration.

---

# Philosophy

Sonion should never pretend to know information that it does not know.

For example:

The application does **not** know:

- exact cooking oil
- exact recipe
- exact ingredient quantities

Instead it should estimate reasonable values and expose uncertainty when appropriate.

---

# Software First, AI Second

AI should **not** be responsible for nutritional knowledge.

Instead:

AI interprets language.

Software performs calculations.

Bad:

```
LLM

↓

"That meal has 720 calories."
```

Good:

```
LLM

↓

"grilled chicken"

↓

USDA database

↓

Nutrition values

↓

Software calculates calories/macros
```

The AI should never hallucinate nutritional values when authoritative data exists.

---

# Data Sources

Primary data source:

USDA FoodData Central

Possible future sources:

- official restaurant nutrition pages
- university dining hall nutrition pages
- manufacturer nutrition information

Preference order:

1. Official nutrition data
2. USDA FoodData Central
3. Closest nutritional approximation
4. AI estimate (only when absolutely necessary)

---

# AI Responsibilities

The language model should:

- understand natural language
- identify foods
- identify preparation methods
- determine Portion Units
- normalize food names
- choose appropriate USDA search terms
- determine when additional clarification is required

The language model should NOT:

- invent calories
- invent protein values
- perform nutrition calculations
- fabricate confidence

---

# Example

Input:

```
2 PU cheesy pasta

1 PU grilled chicken

0.5 PU broccoli
```

Gemma outputs:

```
Food:
Prepared macaroni and cheese

Amount:
2 PU

Food:
Grilled chicken breast

Amount:
1 PU

Food:
Cooked broccoli

Amount:
0.5 PU
```

The application then retrieves nutrition data and calculates totals.

## USDA food-data tools

The server-side food-data layer uses two gitignored local inputs:

- `food-data/FoodData_Central_foundation_food_json_2026-04-30.json`
- `food-data/surveyDownload.json`

Generate the compact normalized runtime index with:

```text
npm run food-data:index
```

`npm run dev`, `npm run build`, and `npm run start` validate the generated index first and rebuild it automatically when it is missing or invalid. These commands require the two local USDA input files above.

The generated `food-data/food-index.json` is kept outside `public/`. Application code should use `searchFoods({ query, limit?, dataset? })` and `getFood({ fdcId })` from `lib/food-data`; raw USDA records, file paths, SQL, URLs, and shell commands are not tool inputs. Search defaults to five results and allows at most ten. Missing nutrient values remain absent, invalid portions are omitted, and unknown IDs return `{ error: "FOOD_NOT_FOUND" }`.

Foundation calorie selection prefers nutrient 2048, then 2047. FNDDS uses nutrient 1008. Calorie entries are never summed.

## Agent tool loop

Meal interpretation is a server-only loop. The model receives the food-tools skill from `lib/agent/food-tools-skill.ts` and must emit exactly one JSON object per turn: a tools object containing a calls array or a result object whose content is a strict non-empty selection object. The Google AI request also asks for an application/json response MIME type. `lib/agent/protocol.ts` rejects Markdown fences, arbitrary prose, unknown envelope fields, unknown tools, invalid JSON, mixed tool/result payloads, malformed selections, and oversized responses. `lib/agent/runner.ts` logs each tool-call attempt, validates arguments against the strict registry, executes only `searchFoods` and `getFood`, sends serialized results back for the next model turn, and enforces fixed round, per-turn call, and size limits from `parameter_files/agent-tool-loop.toml`.

The final model response must be one JSON result object shaped like `{"kind":"result","content":{"items":[{"itemName":"rice","fdcId":123,"portionUnits":1,"portionKind":"solid"}]}}`. The server retrieves authoritative USDA records, calculates volume, density, grams, nutrients, and totals, then returns `{ items, totals }`. The browser validates that response before rendering it. Protocol diagnostics, tool traces, and raw model output stay server-side.

## Meal estimation contract

Each result item uses the USDA food name and contains its FDC ID, Portion Unit quantity, portion kind, estimated milliliters, estimated grams, density provenance, calories, protein, fat, and carbohydrates. Nutrient values are per meal item in the requested amount and are `null` when USDA data is missing. If calories are missing but protein, carbohydrates, and fat are available, calories are derived as `(4 × protein) + (4 × carbohydrates) + (9 × fat)`. Calorie totals sum all available or derived item values, while other nutrient totals remain `null` if any item is missing that nutrient. USDA volume portions are preferred for density; otherwise the response identifies the configured solid or liquid fallback density so the UI can show uncertainty.

---

# MVP Features

## Meal Entry

Single textarea.

Example:

```
2 PU mac and cheese
1 PU chicken
0.5 PU broccoli
```

Button:

Estimate

---

## Results

Display:

Calories

Protein

Carbohydrates

Fat

Example:

```
Calories

725

Protein

48g

Carbs

71g

Fat

24g
```

---

## Daily Goals

Users configure:

- calories
- protein
- carbohydrates
- fat

Application displays:

```
Calories

1710 / 2400

Protein

108 / 160g
```

---

## Local Storage

The browser stores only the Supabase authentication session for this prototype. Nutrition records are not persisted yet; the next data slice should add Supabase tables and row-level security policies keyed to the authenticated user.

---

# Architecture

```
User

↓

Natural language

↓

Gemma

↓

Food normalization

↓

USDA FoodData Central

↓

Nutrition lookup

↓

Portion calculations

↓

Totals

↓

UI
```

---

# Tech Stack

Frontend

- Next.js
- React
- TypeScript

Backend

- Next.js Route Handlers

AI

- Gemma

Nutrition

- USDA FoodData Central

Hosting

- Vercel

Persistence

- Local Storage

---

# Project Structure

```
src/

    app/

        page.tsx

        api/

            estimate/

                route.ts

    lib/

        agent.ts

        usda.ts

        nutrition.ts

        parser.ts

    components/

        MealInput.tsx

        NutritionCard.tsx

        DailyGoals.tsx
```

---

# Future Features

Not part of MVP.

Possible future ideas:

- image support
- barcode scanning
- confidence intervals
- personalized Portion Unit calibration
- meal history
- weight tracking
- macro recommendations
- restaurant lookup
- dining hall integrations
- meal templates
- favorite meals
- offline mode

---

# Non Goals

The MVP is NOT trying to become:

- MyFitnessPal
- Cronometer
- a calorie database
- a bodybuilding tracker

The MVP exists to answer one question:

> Can describing food using intuitive Portion Units produce nutrition estimates that are accurate enough to replace traditional manual tracking?

If the answer is yes, the project can expand from there.
