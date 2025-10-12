export type MacroBreakdown = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealEntry = {
  id: string;
  name: string;
  time: string;
  notes?: string;
  imageUrl: string;
  macros: MacroBreakdown;
  tags: string[];
};

export type GallerySelection = {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
};
