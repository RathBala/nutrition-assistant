import { AiRecap } from "@/components/ai-recap";
import { MacroSummary } from "@/components/macro-summary";
import { MealCard } from "@/components/meal-card";
import { QuickAdd } from "@/components/quick-add";
import type { MealEntry, MacroBreakdown } from "@/components/types";

const todayMacros: MacroBreakdown = {
  calories: 1480,
  protein: 92,
  carbs: 165,
  fat: 42,
};

const macroGoals: Partial<MacroBreakdown> = {
  calories: 2100,
  protein: 130,
  carbs: 240,
  fat: 60,
};

const meals: MealEntry[] = [
  {
    id: "breakfast",
    name: "Greek Yogurt Parfait",
    time: "8:05 AM",
    notes: "High-protein yogurt topped with berries, granola, and a drizzle of honey.",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
    macros: {
      calories: 420,
      protein: 32,
      carbs: 48,
      fat: 12,
    },
    tags: ["Breakfast", "High protein"],
  },
  {
    id: "lunch",
    name: "Salmon Poke Bowl",
    time: "12:42 PM",
    notes: "Wild salmon, sushi rice, cucumber, edamame, and sesame ginger dressing.",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    macros: {
      calories: 560,
      protein: 38,
      carbs: 62,
      fat: 18,
    },
    tags: ["Lunch", "Omega-3"],
  },
  {
    id: "snack",
    name: "Matcha Protein Shake",
    time: "3:15 PM",
    notes: "Pea protein, almond milk, banana, and matcha powder blended with ice.",
    imageUrl: "https://images.unsplash.com/photo-1484980859177-5ac1249fda6f?auto=format&fit=crop&w=800&q=80",
    macros: {
      calories: 240,
      protein: 22,
      carbs: 32,
      fat: 6,
    },
    tags: ["Snack", "On the go"],
  },
  {
    id: "dinner",
    name: "Lemon Herb Chicken",
    time: "7:02 PM",
    notes: "Grilled chicken breast, roasted vegetables, and quinoa.",
    imageUrl: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=800&q=80",
    macros: {
      calories: 260,
      protein: 30,
      carbs: 23,
      fat: 6,
    },
    tags: ["Dinner", "Low carb"],
  },
];

const aiMessage =
  "Nice balance today! You're 620 calories under your goal, so there's room for a nourishing dessert or a larger dinner. Consider adding leafy greens to boost fiber and keep hydration up this evening.";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-dark">Nutrition Assistant</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Your meals for Tuesday, June 4</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Upload photos of what you eat and get instant calorie estimates, macro breakdowns, and gentle coaching from your AI
            companion.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          Log a new meal
        </button>
      </header>

      <QuickAdd />
      <MacroSummary macros={todayMacros} goal={macroGoals} />

      <section className="grid gap-6 lg:grid-cols-[1fr_minmax(260px,320px)]">
        <div className="space-y-5">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
        <div className="space-y-5">
          <AiRecap message={aiMessage} />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Daily targets</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>✅ Stay within 2100 kcal goal</li>
              <li>✅ Hit 90g+ protein</li>
              <li>⬜ Add 2 cups of vegetables at dinner</li>
            </ul>
            <button
              type="button"
              className="mt-6 w-full rounded-full border border-brand bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light"
            >
              Adjust targets
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
