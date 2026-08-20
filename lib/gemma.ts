import { GoogleGenAI } from "@google/genai";

import { getFoodToolsSkill } from "./agent/food-tools-skill";

export const DEFAULT_GEMMA_MODEL = "gemma-4-31b-it";

export function createGemmaClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

export function getGemmaModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMMA_MODEL;
}

export function getGemmaSystemInstruction() {
  return getFoodToolsSkill();
}
