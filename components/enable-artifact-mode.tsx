"use client";

import { useEffect } from "react";
import { useArtifact } from "@/hooks/use-artifact";

export function EnableArtifactMode() {
  const { setArtifact } = useArtifact();

  // Enable artifact mode after client-side hydration is complete
  useEffect(() => {
    // Small delay to ensure hydration is complete before modifying state
    const timer = setTimeout(() => {
      setArtifact((current) => ({
        ...current,
        isVisible: true,
      }));
    }, 100);

    return () => clearTimeout(timer);
  }, [setArtifact]);

  // This is a utility component that doesn't render anything
  return null;
}
