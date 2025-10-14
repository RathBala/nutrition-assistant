"use client";

import { useCallback, useState } from "react";

export const useSignOutAction = (
  signOut: () => Promise<void>,
): {
  handleSignOut: () => void;
  pending: boolean;
  error: string | null;
  dismissError: () => void;
} => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = useCallback(() => {
    if (pending) {
      return;
    }

    setError(null);
    setPending(true);

    void signOut()
      .catch(() => {
        setError("We couldn't sign you out. Please try again.");
      })
      .finally(() => {
        setPending(false);
      });
  }, [pending, signOut]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    handleSignOut,
    pending,
    error,
    dismissError,
  };
};
