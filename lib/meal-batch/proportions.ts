import { z } from "zod";

import { PortionKindSchema, type PortionKind } from "@/lib/meal-estimation/types";

/** Default item cap; server may override via meal-batch-interpretation.toml. */
export const DEFAULT_MAX_ITEMS_PER_MEAL = 20;
export const MAX_FOOD_NAME_LENGTH = 200;

export const PositiveFiniteNumberSchema = z.number().finite().positive();
export const NonNegativeFiniteNumberSchema = z.number().finite().nonnegative();

export const AbsoluteFoodItemSchema = z.object({
  name: z.string().trim().min(1).max(MAX_FOOD_NAME_LENGTH),
  portionUnits: PositiveFiniteNumberSchema,
  portionKind: PortionKindSchema,
}).strict();

export const PercentageFoodItemSchema = z.object({
  name: z.string().trim().min(1).max(MAX_FOOD_NAME_LENGTH),
  percentage: PositiveFiniteNumberSchema,
  portionKind: PortionKindSchema,
}).strict();

export type AbsoluteFoodItem = z.infer<typeof AbsoluteFoodItemSchema>;
export type PercentageFoodItem = z.infer<typeof PercentageFoodItemSchema>;
export type MealEntryMode = "absolute" | "percentage";

export type ScalePercentagesResult =
  | { ok: true; items: AbsoluteFoodItem[] }
  | { ok: false; message: string };

export type ComposeMealPromptResult =
  | { ok: true; items: AbsoluteFoodItem[]; prompt: string }
  | { ok: false; message: string };

function formatPortionUnits(value: number): string {
  return Number(value.toFixed(10)).toString();
}

export function buildMealPromptFromAbsoluteItems(items: AbsoluteFoodItem[]): string {
  return items
    .map((item) => `${formatPortionUnits(item.portionUnits)} PU ${item.name} (${item.portionKind})`)
    .join("\n");
}

function kindTotalLabel(kind: PortionKind): string {
  return kind === "solid" ? "solid total portion units" : "liquid total portion units";
}

/**
 * Per-kind percentage normalization:
 * portionUnits_i = (pct_i / S_k) * totalPU_k
 * where S_k is the sum of percentages for items of kind k only.
 */
export function scalePercentagesToPortionUnits(
  items: PercentageFoodItem[],
  solidTotalPU: number,
  liquidTotalPU: number,
): ScalePercentagesResult {
  if (items.length === 0) {
    return { ok: false, message: "Add at least one food item." };
  }

  for (const [index, item] of items.entries()) {
    if (!Number.isFinite(item.percentage) || item.percentage <= 0) {
      return { ok: false, message: `Food item ${index + 1} needs a positive percentage.` };
    }
  }

  if (!Number.isFinite(solidTotalPU) || solidTotalPU < 0) {
    return { ok: false, message: "Solid total portion units must be a finite non-negative number." };
  }
  if (!Number.isFinite(liquidTotalPU) || liquidTotalPU < 0) {
    return { ok: false, message: "Liquid total portion units must be a finite non-negative number." };
  }

  const solids = items.filter((item) => item.portionKind === "solid");
  const liquids = items.filter((item) => item.portionKind === "liquid");

  if (solids.length > 0 && solidTotalPU <= 0) {
    return { ok: false, message: "Enter a positive solid total when the meal includes solid foods." };
  }
  if (liquids.length > 0 && liquidTotalPU <= 0) {
    return { ok: false, message: "Enter a positive liquid total when the meal includes liquid foods." };
  }

  const solidSum = solids.reduce((sum, item) => sum + item.percentage, 0);
  const liquidSum = liquids.reduce((sum, item) => sum + item.percentage, 0);

  if (solids.length > 0 && solidSum <= 0) {
    return { ok: false, message: "Solid food percentages must sum to a positive total." };
  }
  if (liquids.length > 0 && liquidSum <= 0) {
    return { ok: false, message: "Liquid food percentages must sum to a positive total." };
  }

  const scaled: AbsoluteFoodItem[] = items.map((item) => {
    if (item.portionKind === "solid") {
      return {
        name: item.name,
        portionKind: "solid",
        portionUnits: (item.percentage / solidSum) * solidTotalPU,
      };
    }
    return {
      name: item.name,
      portionKind: "liquid",
      portionUnits: (item.percentage / liquidSum) * liquidTotalPU,
    };
  });

  for (const [index, item] of scaled.entries()) {
    if (!Number.isFinite(item.portionUnits) || item.portionUnits <= 0) {
      return {
        ok: false,
        message: `Could not compute a positive portion for food item ${index + 1} from the ${kindTotalLabel(item.portionKind)}.`,
      };
    }
  }

  return { ok: true, items: scaled };
}

export function validateAbsoluteItems(
  items: unknown,
  maxItems: number,
): ScalePercentagesResult {
  const schema = z.array(AbsoluteFoodItemSchema).min(1).max(maxItems);
  const parsed = schema.safeParse(items);
  if (!parsed.success) {
    return { ok: false, message: "Each absolute-mode item needs a name, positive portion units, and solid or liquid kind." };
  }
  return { ok: true, items: parsed.data };
}

export function composeAbsoluteMealPrompt(
  items: unknown,
  maxItems: number,
): ComposeMealPromptResult {
  const validated = validateAbsoluteItems(items, maxItems);
  if (!validated.ok) return validated;
  return {
    ok: true,
    items: validated.items,
    prompt: buildMealPromptFromAbsoluteItems(validated.items),
  };
}

export function composePercentageMealPrompt(
  items: unknown,
  solidTotalPU: unknown,
  liquidTotalPU: unknown,
  maxItems: number,
): ComposeMealPromptResult {
  const itemsSchema = z.array(PercentageFoodItemSchema).min(1).max(maxItems);
  const parsedItems = itemsSchema.safeParse(items);
  if (!parsedItems.success) {
    return {
      ok: false,
      message: "Each percentage-mode item needs a name, positive percentage, and solid or liquid kind.",
    };
  }

  const solidParsed = NonNegativeFiniteNumberSchema.safeParse(solidTotalPU);
  const liquidParsed = NonNegativeFiniteNumberSchema.safeParse(liquidTotalPU);
  if (!solidParsed.success || !liquidParsed.success) {
    return {
      ok: false,
      message: "Solid and liquid total portion units must be finite non-negative numbers.",
    };
  }

  const scaled = scalePercentagesToPortionUnits(
    parsedItems.data,
    solidParsed.data,
    liquidParsed.data,
  );
  if (!scaled.ok) return scaled;

  return {
    ok: true,
    items: scaled.items,
    prompt: buildMealPromptFromAbsoluteItems(scaled.items),
  };
}
