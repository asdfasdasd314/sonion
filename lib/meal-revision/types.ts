import { z } from "zod";

import {
  MealEstimateSchema,
  PortionKindSchema,
  type MealEstimate,
  type PortionKind,
} from "../meal-estimation/types";

const RevisionReasonSchema = z.string().trim().min(1).max(500);
const RevisionTargetNameSchema = z.string().trim().min(1).max(200);

const ReplaceRevisionSchema = z.object({
  action: z.literal("replace"),
  targetItemIndex: z.number().int().nonnegative(),
  targetItemName: RevisionTargetNameSchema,
  itemName: RevisionTargetNameSchema,
  fdcId: z.number().int().positive(),
  portionUnits: z.number().finite().positive(),
  portionKind: PortionKindSchema,
  reason: RevisionReasonSchema,
}).strict();

const AddRevisionSchema = z.object({
  action: z.literal("add"),
  itemName: RevisionTargetNameSchema,
  fdcId: z.number().int().positive(),
  portionUnits: z.number().finite().positive(),
  portionKind: PortionKindSchema,
  reason: RevisionReasonSchema,
}).strict();

const RemoveRevisionSchema = z.object({
  action: z.literal("remove"),
  targetItemIndex: z.number().int().nonnegative(),
  targetItemName: RevisionTargetNameSchema,
  reason: RevisionReasonSchema,
}).strict();

export const MealRevisionUpdateSchema = z.discriminatedUnion("action", [
  ReplaceRevisionSchema,
  AddRevisionSchema,
  RemoveRevisionSchema,
]);
export type MealRevisionUpdate = z.infer<typeof MealRevisionUpdateSchema>;

export const MealRevisionSchema = z.object({
  updates: z.array(MealRevisionUpdateSchema).max(50),
  notes: z.string().trim().min(1).max(1_200),
}).strict();
export type MealRevision = z.infer<typeof MealRevisionSchema>;

export const MealRevisionResponseSchema = z.object({
  estimate: MealEstimateSchema,
  revision: MealRevisionSchema,
}).strict();
export type MealRevisionResponse = z.infer<typeof MealRevisionResponseSchema>;

export const MealRevisionRequestSchema = z.object({
  instruction: z.string().trim().min(1),
  previousEstimate: MealEstimateSchema,
}).strict();
export type MealRevisionRequest = z.infer<typeof MealRevisionRequestSchema>;

export type RevisionContextItem = {
  itemIndex: number;
  itemName: string;
  fdcId: number;
  portionUnits: number;
  portionKind: PortionKind;
};

export type MealRevisionContext = {
  originalDescription: string;
  items: readonly RevisionContextItem[];
};

export function parseMealRevisionResponse(value: unknown): MealRevisionResponse | undefined {
  const parsed = MealRevisionResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function revisionContextFromEstimate(
  estimate: MealEstimate,
  originalDescription = "",
): MealRevisionContext {
  return {
    originalDescription,
    items: estimate.items.map((item, itemIndex) => ({
      itemIndex,
      itemName: item.foodName,
      fdcId: item.fdcId,
      portionUnits: item.portionUnits,
      portionKind: item.portionKind,
    })),
  };
}
