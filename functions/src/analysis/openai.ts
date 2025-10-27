import OpenAI from "openai";
import { defineSecret } from "firebase-functions/params";

// Secrets (set in Firebase Secret Manager; emulator reads from functions/.env.local)
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
// Model is configurable; store alongside API key for simplicity
const OPENAI_MODEL = defineSecret("OPENAI_MODEL");

export type MealAnalysisItem = {
  name: string;
  quantity: number;
  unit: string;
};

export type MealAnalysis = {
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  items: MealAnalysisItem[];
};

type MealAnalysisInput = {
  imageBuffer?: Buffer | null;
  mealName?: string | null;
};

export async function runOpenAIMealAnalysis(
  input: MealAnalysisInput,
): Promise<MealAnalysis> {
  const apiKey = OPENAI_API_KEY.value();
  const client = new OpenAI({ apiKey });

  const model = (OPENAI_MODEL.value() || "gpt-4o").trim();

  const content: Array<any> = [];

  const normalizedName = (input.mealName ?? "").trim();
  if (normalizedName) {
    content.push({ type: "input_text", text: `Meal name: ${normalizedName}` });
  }

  if (input.imageBuffer && input.imageBuffer.length > 0) {
    const base64 = input.imageBuffer.toString("base64");
    content.push({
      type: "input_image",
      image_url: `data:image/jpeg;base64,${base64}`,
    });
  }

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content,
      },
    ],
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "MealAnalysis",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            calories: { type: "number" },
            macros: {
              type: "object",
              additionalProperties: false,
              properties: {
                protein: { type: "number" },
                carbs: { type: "number" },
                fat: { type: "number" },
              },
              required: ["protein", "carbs", "fat"],
            },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                },
                required: ["name", "quantity", "unit"],
              },
            },
          },
          required: ["calories", "macros", "items"],
        },
        strict: true,
      },
    },
  });

  const text = (response as any).output_text as string | undefined;
  const parsed = text ? (JSON.parse(text) as MealAnalysis) : { calories: 0, macros: { protein: 0, carbs: 0, fat: 0 }, items: [] };

  return {
    calories: Number(parsed.calories) || 0,
    macros: {
      protein: Number((parsed as any).macros?.protein) || 0,
      carbs: Number((parsed as any).macros?.carbs) || 0,
      fat: Number((parsed as any).macros?.fat) || 0,
    },
    items: Array.isArray(parsed.items)
      ? parsed.items.map((it) => ({
          name: String((it as any).name || "Item"),
          quantity: Number((it as any).quantity) || 1,
          unit: String((it as any).unit || "serving"),
        }))
      : [],
  };
}

export const analysisSecrets = [OPENAI_API_KEY, OPENAI_MODEL];


