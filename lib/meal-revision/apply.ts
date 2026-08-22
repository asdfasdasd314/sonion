import type { MealSelection, MealSelectionItem, MealEstimate } from "../meal-estimation/types";
import type { MealRevision, MealRevisionUpdate } from "./types";

export class MealRevisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MealRevisionError";
  }
}

function selectionItemFromUpdate(
  update: Extract<MealRevisionUpdate, { action: "replace" | "add" }>,
): MealSelectionItem {
  return {
    itemName: update.itemName,
    fdcId: update.fdcId,
    portionUnits: update.portionUnits,
    portionKind: update.portionKind,
  };
}

function assertTarget(
  update: Extract<MealRevisionUpdate, { action: "replace" | "remove" }>,
  items: readonly MealSelectionItem[],
  seenTargets: Set<number>,
): void {
  if (update.targetItemIndex >= items.length) {
    throw new MealRevisionError(
      `Revision target ${update.targetItemIndex} does not exist in the current meal.`,
    );
  }
  if (seenTargets.has(update.targetItemIndex)) {
    throw new MealRevisionError(
      `Revision target ${update.targetItemIndex} was updated more than once.`,
    );
  }
  const currentName = items[update.targetItemIndex]?.itemName;
  if (currentName?.trim().toLocaleLowerCase() !== update.targetItemName.trim().toLocaleLowerCase()) {
    throw new MealRevisionError(
      `Revision target ${update.targetItemIndex} no longer matches the saved food.`,
    );
  }
  seenTargets.add(update.targetItemIndex);
}

export function applyMealRevision(
  estimate: MealEstimate,
  revision: MealRevision,
): MealSelection {
  const currentItems: MealSelectionItem[] = estimate.items.map((item) => ({
    itemName: item.foodName,
    fdcId: item.fdcId,
    portionUnits: item.portionUnits,
    portionKind: item.portionKind,
  }));
  const updatesByTarget = new Map<number, MealRevisionUpdate>();
  const additions: MealSelectionItem[] = [];
  const seenTargets = new Set<number>();

  for (const update of revision.updates) {
    if (update.action === "add") {
      additions.push(selectionItemFromUpdate(update));
      continue;
    }

    assertTarget(update, currentItems, seenTargets);
    updatesByTarget.set(update.targetItemIndex, update);
  }

  const revisedItems = currentItems.flatMap((item, index) => {
    const update = updatesByTarget.get(index);
    if (!update) return [item];
    if (update.action === "remove") return [];
    return [selectionItemFromUpdate(update)];
  });
  revisedItems.push(...additions);

  if (revisedItems.length === 0) {
    throw new MealRevisionError("A meal revision must leave at least one food item.");
  }

  return { items: revisedItems };
}
