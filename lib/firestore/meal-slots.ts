import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";

export type MealSlot = {
  id: string;
  name: string;
  position: number;
};

export const DEFAULT_MEAL_SLOTS: MealSlot[] = [
  { id: "breakfast", name: "Breakfast", position: 0 },
  { id: "lunch", name: "Lunch", position: 1 },
  { id: "dinner", name: "Dinner", position: 2 },
  { id: "drinks", name: "Drinks", position: 3 },
];

export const MAX_MEAL_SLOT_NAME_LENGTH = 40;

export const MEAL_SLOT_NAME_PATTERN = /^[A-Za-z0-9 .,'&()\/-]+$/;

export type MealSlotsSnapshot = {
  slots: MealSlot[];
  isDefault: boolean;
};

export const normalizeMealSlotName = (name: string): string => name.trim();

export const createMealSlotId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `slot-${crypto.randomUUID()}`;
  }

  return `slot-${Math.random().toString(36).slice(2, 10)}`;
};

type FirestoreMealSlot = {
  id?: unknown;
  name?: unknown;
  position?: unknown;
};

type MealSlotsDocument = {
  slots?: unknown;
};

const buildFallbackSlotId = (name: string, index: number): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `slot-${slug}` : `slot-${index}`;
};

const coerceMealSlot = (raw: FirestoreMealSlot, index: number): MealSlot | null => {
  const name =
    typeof raw.name === "string" && raw.name.trim().length > 0
      ? normalizeMealSlotName(raw.name)
      : "";

  if (!name) {
    return null;
  }

  const rawId = typeof raw.id === "string" ? raw.id.trim() : "";
  const position =
    typeof raw.position === "number" && Number.isFinite(raw.position)
      ? raw.position
      : index;

  return {
    id: rawId || buildFallbackSlotId(name, index),
    name,
    position,
  };
};

const normalizeSlotsFromDocument = (data: DocumentData | undefined): MealSlot[] => {
  const slotsField = (data as MealSlotsDocument | undefined)?.slots;

  if (!Array.isArray(slotsField)) {
    return [];
  }

  const normalized: MealSlot[] = [];

  slotsField.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      return;
    }

    const slot = coerceMealSlot(raw as FirestoreMealSlot, index);

    if (slot) {
      normalized.push(slot);
    }
  });

  if (normalized.length === 0) {
    return [];
  }

  normalized.sort((a, b) => a.position - b.position);

  return normalized.map((slot, index) => ({
    id: slot.id,
    name: slot.name,
    position: index,
  }));
};

export const subscribeMealSlots = (
  userId: string,
  onUpdate: (snapshot: MealSlotsSnapshot) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe => {
  const firestore = getFirebaseFirestore();
  const documentRef = doc(firestore, "users", userId, "settings", "mealSlots");

  return onSnapshot(
    documentRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate({
          slots: DEFAULT_MEAL_SLOTS.map((slot, index) => ({
            id: slot.id,
            name: slot.name,
            position: index,
          })),
          isDefault: true,
        });
        return;
      }

      const slots = normalizeSlotsFromDocument(snapshot.data());

      onUpdate({
        slots,
        isDefault: false,
      });
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
};

export const saveMealSlots = async (
  userId: string,
  slots: MealSlot[],
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const documentRef = doc(firestore, "users", userId, "settings", "mealSlots");

  const payloadSlots = slots.map((slot, index) => ({
    id: slot.id || buildFallbackSlotId(slot.name, index),
    name: normalizeMealSlotName(slot.name),
    position: index,
  }));

  await setDoc(
    documentRef,
    {
      slots: payloadSlots,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};
