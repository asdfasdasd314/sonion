# Sonion

> Estimate nutrition the way humans actually think about food.

---

# Overview

Sonion is an AI-assisted nutrition tracker built for people who **don't prepare or measure their own meals**.

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

Internally the software estimates this.

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

For MVP:

Everything lives locally.

No authentication.

No database.

No accounts.

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