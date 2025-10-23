# Background Meal Analysis MVP Technical Plan (Firebase Cloud Functions, single upload)

## Overview
Implement automatic background analysis for **single-image uploads**. When a user uploads one photo, it should appear immediately in their daily log with a pending state while the nutrition analysis runs asynchronously. Once the background job finishes, the entry updates in place—no separate drafts or confirmation flows.

The existing stack (Next.js app, Firebase Auth/Firestore/Storage) is retained. Background work runs inside a Firebase Cloud Function so we can stay inside the free tier for a small user base and avoid managing extra infrastructure.

## Goals
- Allow users to upload exactly one photo per meal and see a **Pending analysis** status instantly.
- Process analysis server-side via a Firebase Cloud Function that updates the Firestore meal log once ready.
- Keep the MVP implementable with today’s Firebase setup plus a new Cloud Function and without user confirmation steps.

## Non-Goals
- Multiple-image batching or gallery selection (explicitly scoped out for now).
- Push notifications, template suggestions, or fine-grained confidence tooling.
- Offline-first queuing beyond Firestore’s built-in offline cache.

## High-Level Architecture
1. **Single-image upload (client):** Update the upload UI to restrict to one image. After a successful upload to Firebase Storage (or direct text entry), create a Firestore meal log document with `analysisStatus: "pending"` and the storage path if available.
2. **Background processing (Cloud Function):** A Firestore-triggered Cloud Function (`mealLogsOnCreate`) runs whenever a meal log with `analysisStatus == 'pending'` is written. It downloads the image, invokes the stub analysis helper, and writes results back with `analysisStatus: "complete"`.
3. **Client sync:** The Next.js client subscribes to the user’s `mealLogs` collection for the current day. Pending cards render with a spinner; once `analysisStatus` becomes `complete`, the UI shows the macro summary automatically.

## Data Model
- `mealLogs/{uid}/{logId}`
  ```json
  {
    "uid": "USER_ID",
    "analysisStatus": "pending" | "processing" | "complete" | "error",
    "imagePath": "meal-images/USER_ID/ENTRY_ID.jpg",
    "createdAt": Timestamp,
    "analysis": {
      "items": [{ "name": "Salad", "quantity": 1, "unit": "plate" }],
      "calories": 320,
      "macros": { "protein": 12, "carbs": 28, "fat": 14 }
    },
    "analysisStartedAt": Timestamp,
    "analysisCompletedAt": Timestamp,
    "analysisError": { "code": "ANALYSIS_TIMEOUT", "message": "..." }
  }
  ```

## Backend Implementation (Firebase)
- **Firestore-triggered Cloud Function:**
  - Extend `functions/src/index.ts` with an `onCreate` trigger on `mealLogs/{uid}/{logId}`.
  - Guard the trigger so it only runs for documents where `analysisStatus === 'pending'` and no `analysis` is present.
  - Steps inside the function:
    1. Record `analysisStartedAt` and set `analysisStatus: 'processing'` to avoid duplicate executions.
    2. Download the uploaded image (if available) via Admin SDK.
    3. Call the local stub helper `runStubMealAnalysis(imageBuffer)` that returns deterministic macros/items.
    4. Update the log with the analysis payload, `analysisStatus: 'complete'`, and timestamps.
  - Use built-in retries to handle transient failures (Cloud Functions automatically retries on thrown errors). Add a failure counter and, after N retries, set `analysisStatus: 'error'` with a friendly message.

- **Analysis helper stub:**
  - Create `functions/src/analysis/stub.ts` exporting `runStubMealAnalysis` that mocks the AI response (e.g., returns a fixed set of macros based on image file size hash).
  - Keep this helper pure so it can be swapped for a real model call later.

- **Promotion API:** Not required. The Cloud Function updates the original log entry in place.

- **Security:**
  - Update Firestore rules so clients can create meal logs with `analysisStatus: 'pending'` but only server code can change `analysis` payloads or status transitions.

## Frontend Implementation
- **Upload UI:** Limit file picker/camera to a single image. Update validation messages to reflect "One photo per meal".
- **Meal logging helper:** Reuse a single `logMealEntry` helper that writes the meal log doc with `analysisStatus: 'pending'`.
- **Meal list hook:** Subscribe directly to `mealLogs/{uid}` filtered to today’s window.
- **Card states:**
  - `pending`/`processing`: show thumbnail, "Analyzing" label, spinner.
  - `complete`: show macros/items summary automatically.
  - `error`: show "Couldn’t analyze" messaging with guidance to retry uploading.
- **Review surface:** Not required. Entries update in place once analysis completes.
- **Autosave timer:** Not required.

## Firebase Deployment Considerations
- **Cloud Functions setup:**
  - Add a `functions` directory managed via Firebase CLI (Node 18 runtime). Use `firebase deploy --only functions:mealLogsOnCreate` to ship updates.
  - Configure local emulators (`firebase emulators:start --only functions,firestore,storage`) for integration testing.
- **Environment variables:**
  - If the stub analysis needs configuration (e.g., deterministic seed), set them via `firebase functions:config:set`.
  - Reuse existing client env vars on the Next.js app (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_ENABLE_BACKGROUND_ANALYSIS`).
- **Networking:** All work happens inside Firebase. No additional public endpoints are required beyond existing Firebase/Next.js deployments.
- **Scaling & retries:** Cloud Functions scales automatically. With only two users, the free tier should cover usage. Monitor Cloud Function retries and errors in the Firebase console.

## What You Need to Provide
1. **Firebase project access:** Confirm the Firebase project with Firestore/Storage is linked to the repo and Cloud Functions billing is enabled (Spark/free tier is fine for two users).
2. **Cloud Functions initialization:** Run `firebase init functions` (if not already) so we have the scaffold to add `mealLogsOnCreate`.
3. **Stub analysis acceptance:** Confirm the deterministic stub response shape so we can hard-code copy/macro values that align with UX expectations.
4. **Firestore rules updates:** Approve the proposed rule changes that restrict who can set `analysis` fields and status transitions.

## Testing Plan
- **Local emulator suite:**
  - Use Firebase Emulator to run Firestore/Storage locally.
  - Run the Cloud Function locally against emulator (`firebase emulators:start --only functions,firestore,storage`).
  - Verify flow: create pending meal log → function writes analysis and updates the same document.
- **Integration manual test:**
  - Upload a single image in the dev app.
  - Confirm the pending state shows instantly, transitions to a completed card with macros automatically, and no review step is required.
  - Test error path by forcing the stub helper to throw (toggle a debug flag) and ensure the card shows the failure state.
- **Firebase staging check:**
  - Deploy the Cloud Function to a staging Firebase project or use feature flag gating in production.
  - Upload from the staging web app and verify end-to-end behavior with the deployed function.

## Rollout
- Gate UI and Cloud Function updates behind `NEXT_PUBLIC_ENABLE_BACKGROUND_ANALYSIS` until staging QA completes.
- Monitor Firestore metrics (analysis status distribution, error rate, analysis latency) via logging and Firebase console.
- Once stable, enable the flag for production users.
