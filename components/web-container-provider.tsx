"use client";

import { WebContainer } from "@webcontainer/api";
import { createContext, useContext, useEffect, useState } from "react";

interface WebContainerContextType {
  webcontainer: WebContainer | null;
  isLoading: boolean;
  error: string | null;
}

// Define WebContainer state interface
interface WebContainerState {
  webcontainer: WebContainer | null;
  isLoading: boolean;
  error: string | null;
  reactUrl: string | null;
  isServerRunning: boolean;
  isDependenciesInstalled: boolean;
}

const WebContainerContext = createContext<WebContainerContextType>({
  webcontainer: null,
  isLoading: true,
  error: null,
});

// Create a new context for WebContainer state
const WebContainerStateContext = createContext<{
  state: WebContainerState;
  setState: (updater: (state: WebContainerState) => WebContainerState) => void;
}>({
  state: {
    webcontainer: null,
    isLoading: true,
    error: null,
    reactUrl: null,
    isServerRunning: false,
    isDependenciesInstalled: false,
  },
  setState: () => {},
});

export function useWebContainer() {
  return useContext(WebContainerContext);
}

// Add a hook to access WebContainer state
export function useWebContainerState() {
  return useContext(WebContainerStateContext);
}

export function WebContainerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add WebContainer state
  const [webcontainerState, setWebcontainerState] = useState<WebContainerState>(
    {
      webcontainer: null,
      isLoading: true,
      error: null,
      reactUrl: null,
      isServerRunning: false,
      isDependenciesInstalled: false,
    }
  );

  // Update the state when WebContainer changes
  useEffect(() => {
    setWebcontainerState((state) => ({
      ...state,
      webcontainer,
      isLoading,
      error,
    }));
  }, [webcontainer, isLoading, error]);

  useEffect(() => {
    let isMounted = true;

    // Check if we're in a browser environment where WebContainer can run
    if (typeof window === "undefined") {
      setIsLoading(false);
      setError("WebContainers can only run in browser environments");
      return;
    }

    // Check if we're in a secure context (required for WebContainers)
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setIsLoading(false);
      setError("WebContainers require a secure context (HTTPS or localhost)");
      return;
    }

    // Check if headers are correctly set
    const checkIsolation = async () => {
      try {
        const isSupported =
          typeof window !== "undefined" && "crossOriginIsolated" in window;
        console.log("Cross-origin isolation supported:", isSupported);
        console.log("Cross-origin isolated:", window.crossOriginIsolated);

        if (isSupported && !window.crossOriginIsolated) {
          console.warn(
            "Cross-origin isolation is not enabled. WebContainers may not work correctly."
          );
        }
      } catch (e) {
        console.error("Error checking cross-origin isolation:", e);
      }
    };

    checkIsolation();

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

    // Only boot the WebContainer if we don't already have one
    if (!webcontainer) {
      bootWebContainer();
    }

    return () => {
      isMounted = false;
    };
  }, [webcontainer]); // Depend on webcontainer to avoid rebooting if already exists

  return (
    <WebContainerContext.Provider
      value={{
        webcontainer,
        isLoading,
        error,
      }}
    >
      <WebContainerStateContext.Provider
        value={{
          state: webcontainerState,
          setState: setWebcontainerState,
        }}
      >
        {children}
      </WebContainerStateContext.Provider>
    </WebContainerContext.Provider>
  );
}
