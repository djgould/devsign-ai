import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

interface UseWebContainerReturnType {
  webcontainer: WebContainer | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for initializing and managing the WebContainer instance
 *
 * @returns {UseWebContainerReturnType} Object containing the WebContainer instance, loading state, and any errors
 */
export function useWebContainer(): UseWebContainerReturnType {
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Check if the browser supports cross-origin isolation
    const checkIsolation = async () => {
      try {
        if (!window.crossOriginIsolated) {
          console.warn(
            "Cross-Origin Isolation is not enabled. WebContainer may not work properly."
          );
        }
      } catch (e) {
        console.error("Error checking cross-origin isolation:", e);
      }
    };

    checkIsolation();

    // Initialize and boot the WebContainer
    async function bootWebContainer() {
      try {
        setIsLoading(true);
        console.log("Booting WebContainer...");

        // Boot the WebContainer
        const instance = await WebContainer.boot();
        console.log("WebContainer booted successfully");

        if (isMounted) {
          setWebcontainer(instance);
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        console.error("Failed to initialize WebContainer:", err);

        let errorMessage = "Failed to initialize WebContainer";

        // Provide more detailed error messages based on common failure modes
        if (err.message && err.message.includes("WebAssembly.Memory")) {
          errorMessage =
            "WebContainer initialization failed: WebAssembly.Memory cannot be serialized. This usually indicates missing COOP/COEP headers.";
        } else if (err.message) {
          errorMessage = `WebContainer initialization failed: ${err.message}`;
        }

        if (isMounted) {
          setError(errorMessage);
          setIsLoading(false);
        }
      }
    }

    // Boot the WebContainer when the component mounts
    bootWebContainer();

    // Clean up function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    webcontainer,
    isLoading,
    error,
  };
}
