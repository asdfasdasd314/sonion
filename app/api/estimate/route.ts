import { NextResponse } from "next/server";

import {
  createGemmaClient,
  getGemmaModel,
  getGemmaSystemInstruction,
} from "@/lib/gemma";

const MAX_PROMPT_LENGTH = 2_000;

type PromptBody = {
  prompt: unknown;
};

function isPromptBody(value: unknown): value is PromptBody {
  return typeof value === "object" && value !== null && "prompt" in value;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Send a valid JSON request body.", 400);
  }

  if (!isPromptBody(body) || typeof body.prompt !== "string") {
    return errorResponse('The request body must include a string "prompt".', 400);
  }

  const prompt = body.prompt.trim();

  if (!prompt) {
    return errorResponse("Enter a food description before submitting.", 400);
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return errorResponse(
      `Keep the prompt under ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`,
      400,
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return errorResponse(
      "Gemma is not configured yet. Add GEMINI_API_KEY to your local environment and restart the app.",
      503,
    );
  }

  try {
    const model = getGemmaModel();
    const client = createGemmaClient(apiKey);
    const result = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: getGemmaSystemInstruction(),
      },
    });
    const response = result.text?.trim();

    if (!response) {
      return errorResponse(
        "Google AI returned an empty response. Try the prompt again.",
        502,
      );
    }

    return NextResponse.json({ response });
  } catch {
    const model = getGemmaModel();
    return errorResponse(
      `Google AI could not process this request. The configured model (${model}) may be unavailable through Google AI Studio.`,
      502,
    );
  }
}
