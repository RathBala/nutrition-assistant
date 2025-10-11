import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, SafeAreaView, ScrollView, Text, View } from 'react-native';

type MacroBreakdown = {
  protein: number;
  carbs: number;
  fat: number;
};

type Meal = {
  id: number;
  name: string;
  time: string;
  calories: number;
  macros: MacroBreakdown;
  notes: string;
  image: string;
};

const meals: Meal[] = [
  {
    id: 1,
    name: 'Avocado Toast with Eggs',
    time: '08:30 AM · Breakfast',
    calories: 365,
    macros: {
      protein: 18,
      carbs: 32,
      fat: 18
    },
    notes: 'Whole grain toast, avocado spread, poached eggs, cherry tomatoes.',
    image:
      'https://images.unsplash.com/photo-1546069901-eacef0df6022?auto=format&fit=crop&w=600&q=60'
  },
  {
    id: 2,
    name: 'Vibrant Quinoa Salad',
    time: '12:45 PM · Lunch',
    calories: 420,
    macros: {
      protein: 22,
      carbs: 48,
      fat: 14
    },
    notes: 'Rainbow veggies, herbed quinoa, grilled chicken, lemon vinaigrette.',
    image:
      'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=60'
  },
  {
    id: 3,
    name: 'Miso Glazed Salmon Bowl',
    time: '06:30 PM · Dinner',
    calories: 510,
    macros: {
      protein: 34,
      carbs: 45,
      fat: 22
    },
    notes: 'Seared salmon, sesame greens, brown rice, pickled veggies.',
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=60'
  }
];

const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
const totalMacros = meals.reduce(
  (totals, meal) => ({
    protein: totals.protein + meal.macros.protein,
    carbs: totals.carbs + meal.macros.carbs,
    fat: totals.fat + meal.macros.fat
  }),
  { protein: 0, carbs: 0, fat: 0 }
);

const MacroPill = ({
  label,
  value,
  unit,
  backgroundClass,
  dotClass
}: {
  label: string;
  value: number;
  unit: string;
  backgroundClass: string;
  dotClass: string;
}) => (
  <View className={`rounded-full px-3 py-1 flex-row items-center gap-2 ${backgroundClass}`}>
    <View className={`h-2 w-2 rounded-full ${dotClass}`} />
    <Text className="text-xs font-medium text-slate-600">
      {label}{' '}
      <Text className="font-semibold text-slate-900">
        {value}
        {unit}
      </Text>
    </Text>
  </View>
);

const MacroProgress = ({
  label,
  value,
  target,
  barClass
}: {
  label: string;
  value: number;
  target: number;
  barClass: string;
}) => {
  const width = Math.min(100, (value / target) * 100);
  return (
    <View className="flex-1">
      <View className="flex-row justify-between">
        <Text className="text-sm font-semibold text-slate-900">{label}</Text>
        <Text className="text-sm font-medium text-slate-500">
          {value}g <Text className="text-xs">/ {target}g</Text>
        </Text>
      </View>
      <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <View style={{ width: `${width}%` }} className={`h-full rounded-full ${barClass}`} />
      </View>
    </View>
  );
};

const AssistantCard = () => (
  <View className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
    <View className="mb-3 flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-light">
        <Text className="text-lg font-bold text-brand">AI</Text>
      </View>
      <Text className="text-base font-semibold text-slate-900">Your Nutrition Assistant</Text>
    </View>
    <Text className="text-base leading-relaxed text-slate-600">
      "Great balance today! You hit <Text className="font-semibold text-slate-900">74% of your protein goal</Text> and stayed within your calorie target. Consider adding a small snack with healthy fats this evening to round things out."
    </Text>
  </View>
);

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24 }} className="flex-1">
        <View className="mb-6">
          <Text className="text-xs uppercase tracking-[4px] text-slate-400">Today</Text>
          <Text className="mt-2 text-3xl font-semibold text-slate-900">Wednesday, March 6</Text>
        </View>

        <View className="rounded-3xl bg-white p-6 shadow-sm">
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-medium text-slate-500">Calorie intake</Text>
              <Text className="mt-1 text-3xl font-bold text-slate-900">{totalCalories} kcal</Text>
            </View>
            <View className="rounded-full bg-brand-light px-3 py-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-brand">Goal 1,850 kcal</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <MacroPill
              label="Protein"
              value={totalMacros.protein}
              unit="g"
              backgroundClass="bg-brand/10"
              dotClass="bg-brand"
            />
            <MacroPill
              label="Carbs"
              value={totalMacros.carbs}
              unit="g"
              backgroundClass="bg-emerald-100"
              dotClass="bg-emerald-500"
            />
            <MacroPill
              label="Fat"
              value={totalMacros.fat}
              unit="g"
              backgroundClass="bg-amber-100"
              dotClass="bg-amber-500"
            />
          </View>

          <View className="mt-6 gap-4">
            <MacroProgress label="Protein" value={totalMacros.protein} target={120} barClass="bg-brand" />
            <MacroProgress label="Carbs" value={totalMacros.carbs} target={220} barClass="bg-emerald-500" />
            <MacroProgress label="Fat" value={totalMacros.fat} target={70} barClass="bg-amber-500" />
          </View>
        </View>

        <View className="mt-8 flex-row items-center justify-between">
          <Text className="text-xl font-semibold text-slate-900">Meals logged</Text>
          <Text className="text-sm font-medium text-brand">+ Add meal</Text>
        </View>

        <View className="mt-4 gap-5">
          {meals.map((meal) => (
            <View key={meal.id} className="rounded-3xl bg-white shadow-sm">
              <Image source={{ uri: meal.image }} className="h-44 w-full rounded-t-3xl" resizeMode="cover" />
              <View className="p-5">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-lg font-semibold text-slate-900">{meal.name}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{meal.time}</Text>
                  </View>
                  <Text className="text-lg font-semibold text-slate-900">{meal.calories} kcal</Text>
                </View>
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <MacroPill
                    label="Protein"
                    value={meal.macros.protein}
                    unit="g"
                    backgroundClass="bg-brand/10"
                    dotClass="bg-brand"
                  />
                  <MacroPill
                    label="Carbs"
                    value={meal.macros.carbs}
                    unit="g"
                    backgroundClass="bg-emerald-100"
                    dotClass="bg-emerald-500"
                  />
                  <MacroPill
                    label="Fat"
                    value={meal.macros.fat}
                    unit="g"
                    backgroundClass="bg-amber-100"
                    dotClass="bg-amber-500"
                  />
                </View>
                <Text className="mt-4 text-sm leading-6 text-slate-600">{meal.notes}</Text>
              </View>
            </View>
          ))}
        </View>

        <AssistantCard />

        <View className="my-10 items-center">
          <View className="w-full rounded-full bg-brand px-6 py-4 shadow-lg">
            <Text className="text-center text-base font-semibold text-white">Log another meal</Text>
          </View>
          <Text className="mt-3 text-xs text-slate-400">Photos make tracking fun and effortless.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
