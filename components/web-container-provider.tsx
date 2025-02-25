"use client";

import { WebContainer } from "@webcontainer/api";
import { createContext, useContext, useEffect, useState } from "react";

interface WebContainerContextType {
  webcontainer: WebContainer | null;
  isLoading: boolean;
  error: string | null;
}

const WebContainerContext = createContext<WebContainerContextType>({
  webcontainer: null,
  isLoading: true,
  error: null,
});

export function useWebContainer() {
  return useContext(WebContainerContext);
}

export function WebContainerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Create initial filesystem
        console.log("Initializing filesystem...");
        await instance.mount({
          "index.js": {
            file: {
              contents: "// This file will be replaced with user code",
            },
          },
          "package.json": {
            file: {
              contents: JSON.stringify({
                name: "web-container-code",
                type: "module",
                dependencies: {},
                scripts: {
                  start: "node index.js",
                },
              }),
            },
          },
        });
        console.log("Filesystem initialized");

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

    bootWebContainer();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <WebContainerContext.Provider
      value={{
        webcontainer,
        isLoading,
        error,
      }}
    >
      {children}
    </WebContainerContext.Provider>
  );
}
