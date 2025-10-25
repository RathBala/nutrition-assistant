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


