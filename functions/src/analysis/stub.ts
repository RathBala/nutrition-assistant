export type StubMealAnalysis = {
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  items: {
    name: string;
    quantity: number;
    unit: string;
  }[];
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

const pickResponse = (buffer: Buffer): StubMealAnalysis => {
  if (buffer.length === 0) {
    return SAMPLE_RESPONSES[0];
  }

  const index = buffer[0] % SAMPLE_RESPONSES.length;
  return SAMPLE_RESPONSES[index];
};

type StubMealAnalysisInput = {
  imageBuffer?: Buffer | null;
  mealName?: string | null;
};

const computeSeed = ({ imageBuffer, mealName }: StubMealAnalysisInput): number => {
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

export const runStubMealAnalysis = async (
  input: StubMealAnalysisInput,
): Promise<StubMealAnalysis> => {
  // Simulate latency for the MVP so the client can show the pending state.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const seed = computeSeed(input);
  const buffer = input.imageBuffer ?? Buffer.from([seed]);

  return pickResponse(buffer);
};

