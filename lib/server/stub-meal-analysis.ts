export type StubMealAnalysisItem = {
  name: string;
  quantity: number;
  unit: string;
};

export type StubMealAnalysis = {
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  items: StubMealAnalysisItem[];
};

const SAMPLE_RESPONSES: StubMealAnalysis[] = [
  {
    calories: 520,
    macros: {
      protein: 32,
      carbs: 48,
      fat: 22,
    },
    items: [
      { name: "Grilled chicken", quantity: 1, unit: "plate" },
      { name: "Roasted vegetables", quantity: 1, unit: "cup" },
      { name: "Brown rice", quantity: 1, unit: "cup" },
    ],
  },
  {
    calories: 360,
    macros: {
      protein: 18,
      carbs: 42,
      fat: 12,
    },
    items: [
      { name: "Greek yogurt", quantity: 1, unit: "bowl" },
      { name: "Granola", quantity: 0.5, unit: "cup" },
      { name: "Mixed berries", quantity: 0.75, unit: "cup" },
    ],
  },
  {
    calories: 610,
    macros: {
      protein: 26,
      carbs: 55,
      fat: 28,
    },
    items: [
      { name: "Salmon fillet", quantity: 1, unit: "piece" },
      { name: "Mashed potatoes", quantity: 1, unit: "cup" },
      { name: "Side salad", quantity: 1, unit: "bowl" },
    ],
  },
];

const computeSeed = (imageBuffer?: Buffer | null, mealName?: string | null): number => {
  if (imageBuffer && imageBuffer.length > 0) {
    return imageBuffer[0];
  }

  const normalizedName = mealName?.trim().toLowerCase();

  if (normalizedName && normalizedName.length > 0) {
    let hash = 0;

    for (let index = 0; index < normalizedName.length; index += 1) {
      hash = (hash + normalizedName.charCodeAt(index)) % 256;
    }

    return hash;
  }

  return 0;
};

const pickResponse = (seed: number): StubMealAnalysis => {
  if (seed === 0) {
    return SAMPLE_RESPONSES[0];
  }

  return SAMPLE_RESPONSES[seed % SAMPLE_RESPONSES.length];
};

export type RunStubMealAnalysisInput = {
  imageBuffer?: Buffer | null;
  mealName?: string | null;
};

export const runStubMealAnalysis = async (
  input: RunStubMealAnalysisInput,
): Promise<StubMealAnalysis> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const seed = computeSeed(input.imageBuffer, input.mealName);
  const buffer = input.imageBuffer ?? Buffer.from([seed]);

  return pickResponse(buffer[0]);
};
