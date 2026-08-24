import {
  createGemmaClient,
  getNextMealModel,
} from "@/lib/gemma";
import { runMealAgent, type AgentGenerationAdapter } from "@/lib/agent/runner";
import type { FoodToolRegistry } from "@/lib/food-data";
import { NormalizedFoodSchema, type NormalizedFood } from "@/lib/food-data/types";
import { estimateMeal, MealEstimationError } from "@/lib/meal-estimation";
import { applyMealRevision, MealRevisionError } from "@/lib/meal-revision/apply";
import { MEAL_REVISION_PARAMETERS } from "@/lib/meal-revision/config";
import {
  revisionContextFromEstimate,
  type MealRevision,
} from "@/lib/meal-revision/types";
import type { MealEstimate, MealSelection } from "@/lib/meal-estimation/types";

export type EstimatePipelineResult = {
  estimate: MealEstimate;
  revision?: MealRevision;
};

export type EstimatePipelineInput = {
  prompt: string;
  tools: FoodToolRegistry;
  generate: AgentGenerationAdapter;
  revisionRequest?: {
    instruction: string;
    previousEstimate: MealEstimate;
  };
};

export function createMealGenerateAdapter(apiKey: string): AgentGenerationAdapter {
  const client = createGemmaClient(apiKey);
  return async ({ systemInstruction, contents }) => {
    const model = getNextMealModel();
    console.log("Meal agent model request.", { model });
    const result = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });
    return result.text ?? "";
  };
}

export async function runMealEstimatePipeline(
  input: EstimatePipelineInput,
): Promise<EstimatePipelineResult> {
  let revision: MealRevision | undefined;
  let selection: MealSelection;

  if (input.revisionRequest) {
    revision = await runMealAgent({
      mealPrompt: input.revisionRequest.instruction,
      tools: input.tools,
      generate: input.generate,
      responseMode: "revision",
      revisionContext: revisionContextFromEstimate(
        input.revisionRequest.previousEstimate,
        input.prompt,
      ),
    });
    if (
      revision.updates.length > MEAL_REVISION_PARAMETERS.maxUpdates
      || revision.notes.length > MEAL_REVISION_PARAMETERS.notesMaxLength
    ) {
      throw new MealRevisionError("The revision contains too many updates.");
    }
    selection = applyMealRevision(input.revisionRequest.previousEstimate, revision);
  } else {
    selection = await runMealAgent({
      mealPrompt: input.prompt,
      tools: input.tools,
      generate: input.generate,
    });
  }

  const authoritativeFoods: NormalizedFood[] = [];
  for (const item of selection.items) {
    const record = await input.tools.getFood.execute({ fdcId: item.fdcId });
    if (!NormalizedFoodSchema.safeParse(record).success) {
      throw new MealEstimationError(
        "UNKNOWN_FDC_ID",
        "The model selected an FDC ID that is not in the authoritative USDA index.",
      );
    }
    authoritativeFoods.push(record as NormalizedFood);
  }

  return {
    estimate: estimateMeal(selection, authoritativeFoods),
    ...(revision ? { revision } : {}),
  };
}
