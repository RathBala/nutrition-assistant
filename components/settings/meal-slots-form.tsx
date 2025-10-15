"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, MutableRefObject } from "react";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { useMealSlots } from "@/hooks/use-meal-slots";
import {
  MAX_MEAL_SLOT_NAME_LENGTH,
  MEAL_SLOT_NAME_PATTERN,
  createMealSlotId,
  normalizeMealSlotName,
  type MealSlot,
} from "@/lib/firestore/meal-slots";

const DUPLICATE_ERROR_MESSAGE = "Meal slot names must be unique";
const BLANK_NAME_ERROR_MESSAGE = "Enter a meal slot name";
const NAME_RULES_MESSAGE = `Meal slot names must be 1-${MAX_MEAL_SLOT_NAME_LENGTH} characters using letters, numbers, spaces, or . , ' & ( ) - /.`;

const LOADING_MESSAGE = "Loading meal slots…";

const toEditableSlots = (slots: MealSlot[]) => slots.map((slot) => ({ id: slot.id, name: slot.name }));

type EditableSlot = {
  id: string;
  name: string;
};

type MealSlotsFormProps = {
  userId: string;
};

export function MealSlotsForm({ userId }: MealSlotsFormProps) {
  const {
    slots: savedSlots,
    loading,
    error: loadError,
    isDefault,
    saving,
    save,
    saveError,
    clearSaveError,
    refresh,
  } = useMealSlots(userId);

  const [editableSlots, setEditableSlots] = useState<EditableSlot[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [touchedSlots, setTouchedSlots] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sanitizedEditableSlots = useMemo(
    () =>
      editableSlots.map((slot, index) => ({
        id: slot.id,
        name: normalizeMealSlotName(slot.name),
        position: index,
      })),
    [editableSlots],
  );

  const sanitizedSavedSlots = useMemo(
    () =>
      savedSlots.map((slot, index) => ({
        id: slot.id,
        name: slot.name,
        position: index,
      })),
    [savedSlots],
  );

  const validationMessages = useMemo(() => {
    const messages = new Map<string, string>();
    const duplicateTracker = new Map<string, number>();

    sanitizedEditableSlots.forEach((slot) => {
      if (slot.name) {
        const key = slot.name.toLowerCase();
        duplicateTracker.set(key, (duplicateTracker.get(key) ?? 0) + 1);
      }
    });

    sanitizedEditableSlots.forEach((slot) => {
      if (!slot.name) {
        messages.set(slot.id, BLANK_NAME_ERROR_MESSAGE);
        return;
      }

      if (slot.name.length > MAX_MEAL_SLOT_NAME_LENGTH) {
        messages.set(slot.id, NAME_RULES_MESSAGE);
        return;
      }

      if (!MEAL_SLOT_NAME_PATTERN.test(slot.name)) {
        messages.set(slot.id, NAME_RULES_MESSAGE);
      }
    });

    sanitizedEditableSlots.forEach((slot) => {
      if (!slot.name) {
        return;
      }

      const count = duplicateTracker.get(slot.name.toLowerCase()) ?? 0;

      if (count > 1) {
        messages.set(slot.id, DUPLICATE_ERROR_MESSAGE);
      }
    });

    return messages;
  }, [sanitizedEditableSlots]);

  const hasValidationErrors = validationMessages.size > 0;

  const isDirty = useMemo(() => {
    if (!hasHydrated) {
      return false;
    }

    if (sanitizedEditableSlots.length !== sanitizedSavedSlots.length) {
      return true;
    }

    for (let index = 0; index < sanitizedEditableSlots.length; index += 1) {
      const editable = sanitizedEditableSlots[index];
      const saved = sanitizedSavedSlots[index];

      if (!saved) {
        return true;
      }

      if (editable.id !== saved.id) {
        return true;
      }

      if (editable.name !== saved.name) {
        return true;
      }
    }

    return false;
  }, [hasHydrated, sanitizedEditableSlots, sanitizedSavedSlots]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const nextSlots = toEditableSlots(savedSlots);

    if (!hasHydrated) {
      setEditableSlots(nextSlots);
      setHasHydrated(true);
      setTouchedSlots({});
      setSubmitAttempted(false);
      return;
    }

    if (!isDirty) {
      setEditableSlots(nextSlots);
      setTouchedSlots({});
      setSubmitAttempted(false);
    }
  }, [hasHydrated, isDirty, loading, savedSlots]);

  useEffect(() => {
    if (!pendingFocusId) {
      return;
    }

    const input = inputRefs.current[pendingFocusId];

    if (input) {
      input.focus();
      input.select();
      setPendingFocusId(null);
    }
  }, [editableSlots, pendingFocusId]);

  useEffect(() => {
    if (!successVisible) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessVisible(false), 4000);

    return () => window.clearTimeout(timeout);
  }, [successVisible]);

  const handleNameChange = (id: string, value: string) => {
    setEditableSlots((previous) =>
      previous.map((slot) => (slot.id === id ? { ...slot, name: value } : slot)),
    );

    if (saveError) {
      clearSaveError();
    }

    if (successVisible) {
      setSuccessVisible(false);
    }
  };

  const handleNameBlur = (id: string) => {
    setTouchedSlots((previous) => ({ ...previous, [id]: true }));
    setEditableSlots((previous) =>
      previous.map((slot) =>
        slot.id === id ? { ...slot, name: normalizeMealSlotName(slot.name) } : slot,
      ),
    );
  };

  const handleAddSlot = () => {
    const newSlot: EditableSlot = { id: createMealSlotId(), name: "" };
    setEditableSlots((previous) => [...previous, newSlot]);
    setTouchedSlots((previous) => ({ ...previous, [newSlot.id]: false }));
    setPendingFocusId(newSlot.id);
    setSubmitAttempted(false);

    if (saveError) {
      clearSaveError();
    }

    if (successVisible) {
      setSuccessVisible(false);
    }
  };

  const handleRemoveSlot = (id: string) => {
    setEditableSlots((previous) => previous.filter((slot) => slot.id !== id));
    setTouchedSlots((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });

    if (saveError) {
      clearSaveError();
    }

    if (successVisible) {
      setSuccessVisible(false);
    }
  };

  const handleDiscardChanges = () => {
    const nextSlots = toEditableSlots(savedSlots);
    setEditableSlots(nextSlots);
    setTouchedSlots({});
    setSubmitAttempted(false);
    setSuccessVisible(false);

    if (saveError) {
      clearSaveError();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);

    if (hasValidationErrors || !isDirty) {
      return;
    }

    const slotsToPersist: MealSlot[] = sanitizedEditableSlots.map((slot, index) => ({
      id: slot.id,
      name: slot.name,
      position: index,
    }));

    try {
      await save(slotsToPersist);
      setSuccessVisible(true);
    } catch {
      // Errors are surfaced through saveError state
    }
  };

  useEffect(() => {
    if (saveError) {
      setSuccessVisible(false);
    }
  }, [saveError]);

  const persistSlots = useCallback(
    async (slots: EditableSlot[]) => {
      const slotsToPersist: MealSlot[] = slots.map((slot, index) => ({
        id: slot.id,
        name: normalizeMealSlotName(slot.name),
        position: index,
      }));

      try {
        await save(slotsToPersist);
        setSuccessVisible(true);
      } catch {
        // Errors are surfaced through saveError state
      }
    },
    [save],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      let nextSlots: EditableSlot[] | null = null;

      setEditableSlots((previous) => {
        const oldIndex = previous.findIndex((slot) => slot.id === active.id);
        const newIndex = previous.findIndex((slot) => slot.id === over.id);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return previous;
        }

        nextSlots = arrayMove(previous, oldIndex, newIndex);
        return nextSlots;
      });

      if (!nextSlots) {
        return;
      }

      if (saveError) {
        clearSaveError();
      }

      if (successVisible) {
        setSuccessVisible(false);
      }

      if (hasValidationErrors) {
        return;
      }

      await persistSlots(nextSlots);
    },
    [clearSaveError, hasValidationErrors, persistSlots, saveError, successVisible],
  );

  const showLoadingState = !hasHydrated && loading;
  const disableSave = loading || saving || !isDirty || hasValidationErrors;
  const disableDiscard = loading || saving || !isDirty;
  const disableReordering = loading || saving;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-4">
          {showLoadingState ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="h-4 w-4 animate-spin rounded-full border border-slate-400 border-t-transparent" aria-hidden="true" />
              {LOADING_MESSAGE}
            </div>
          ) : null}

          {loadError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={refresh}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/80 transition hover:text-amber-900"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          {saveError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {saveError}
            </div>
          ) : null}

          {successVisible ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
              Meal slots updated.
            </div>
          ) : null}

          {isDefault ? (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              These are your default meal slots. Add, rename, or remove them to match how you log meals.
            </p>
          ) : null}

          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={editableSlots.map((slot) => slot.id)}
                strategy={verticalListSortingStrategy}
              >
                {editableSlots.map((slot, index) => {
                  const slotError = validationMessages.get(slot.id);
                  const showSlotError =
                    !!slotError &&
                    (submitAttempted || touchedSlots[slot.id] || slotError === DUPLICATE_ERROR_MESSAGE);

                  return (
                    <SortableMealSlotItem
                      key={slot.id}
                      slot={slot}
                      index={index}
                      disableInteractions={disableReordering}
                      slotError={slotError}
                      showSlotError={showSlotError}
                      handleNameChange={handleNameChange}
                      handleNameBlur={handleNameBlur}
                      handleRemoveSlot={handleRemoveSlot}
                      inputRefs={inputRefs}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>

          {editableSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
              No meal slots configured. Logging will be disabled until you add at least one slot.
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleAddSlot}
            disabled={loading || saving}
            className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:text-emerald-300"
          >
            Add slot
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDiscardChanges}
              disabled={disableDiscard}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Discard changes
            </button>
            <button
              type="submit"
              disabled={disableSave}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/70 border-t-transparent" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

type SortableMealSlotItemProps = {
  slot: EditableSlot;
  index: number;
  disableInteractions: boolean;
  slotError?: string;
  showSlotError: boolean;
  handleNameChange: (id: string, value: string) => void;
  handleNameBlur: (id: string) => void;
  handleRemoveSlot: (id: string) => void;
  inputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
};

function SortableMealSlotItem({
  slot,
  index,
  disableInteractions,
  slotError,
  showSlotError,
  handleNameChange,
  handleNameBlur,
  handleRemoveSlot,
  inputRefs,
}: SortableMealSlotItemProps) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.id,
    disabled: disableInteractions,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-slate-200 bg-white p-4 transition ${
        isDragging ? "shadow-lg ring-1 ring-emerald-300" : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:flex-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            disabled={disableInteractions}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
              disableInteractions ? "cursor-not-allowed text-slate-300" : "cursor-grab active:cursor-grabbing hover:text-slate-600"
            }`}
            aria-label={`Reorder meal slot ${index + 1}${slot.name ? `, ${slot.name}` : ""}`}
          >
            <GripVertical className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex-1">
            <label
              htmlFor={`meal-slot-${slot.id}`}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
            >
              Meal slot {index + 1}
            </label>
            <input
              ref={(element) => {
                if (element) {
                  inputRefs.current[slot.id] = element;
                } else {
                  delete inputRefs.current[slot.id];
                }
              }}
              id={`meal-slot-${slot.id}`}
              type="text"
              value={slot.name}
              onChange={(event) => handleNameChange(slot.id, event.target.value)}
              onBlur={() => handleNameBlur(slot.id)}
              disabled={disableInteractions}
              className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                showSlotError
                  ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                  : "border-slate-200"
              } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
              placeholder="Meal slot name"
              maxLength={MAX_MEAL_SLOT_NAME_LENGTH + 10}
              aria-invalid={showSlotError ? "true" : undefined}
              aria-describedby={showSlotError ? `meal-slot-${slot.id}-error` : undefined}
            />
            {showSlotError ? (
              <p id={`meal-slot-${slot.id}-error`} className="mt-2 text-xs font-semibold text-red-600">
                {slotError}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleRemoveSlot(slot.id)}
          disabled={disableInteractions}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
