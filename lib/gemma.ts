import { GoogleGenAI } from "@google/genai";

import { getFoodToolsSkill } from "./agent/food-tools-skill";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_GEMMA_MODEL = "gemma-4-31b-it";

export type AlternatingModelSelector = () => string;

export function createAlternatingModelSelector(
  defaultModel: string = DEFAULT_GEMINI_MODEL,
  alternateModel: string = DEFAULT_GEMMA_MODEL,
): AlternatingModelSelector {
  let useDefaultModel = true;

  return () => {
    const model = useDefaultModel ? defaultModel : alternateModel;
    useDefaultModel = !useDefaultModel;
    return model;
  };
}

const nextModelProvider = createAlternatingModelSelector("gemini", "gemma");

export function createGemmaClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

export function getGeminiModel() {
  return process.env.GEMINI_FLASH_LITE_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getGemmaModel() {
  return process.env.GEMMA_MODEL?.trim() || DEFAULT_GEMMA_MODEL;
}

export function getNextMealModel() {
  return nextModelProvider() === "gemini" ? getGeminiModel() : getGemmaModel();
}

export function getGemmaSystemInstruction() {
  return getFoodToolsSkill();
}
