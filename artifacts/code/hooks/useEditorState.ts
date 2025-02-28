import { useState, useCallback, useEffect, RefObject } from "react";

export type EditorMode = "editor" | "preview";

export interface EditorMetadata {
  outputs?: Array<string>;
  reactUrl?: string;
  previousReactUrl?: string;
  mode?: EditorMode;
}

interface UseEditorStateProps {
  initialMetadata?: EditorMetadata;
  onMetadataChange?: (metadata: EditorMetadata) => void;
  iframeRef?: RefObject<HTMLIFrameElement>;
}

interface UseEditorStateReturnType {
  metadata: EditorMetadata;
  setMetadata: (
    updater: EditorMetadata | ((prev: EditorMetadata) => EditorMetadata)
  ) => void;
  switchToEditorMode: () => void;
  switchToPreviewMode: () => void;
  isEditorMode: boolean;
  isPreviewMode: boolean;
}

/**
 * Custom hook for managing editor state, including tab navigation and mode switching
 *
 * @param {UseEditorStateProps} props - Configuration options
 * @returns {UseEditorStateReturnType} Editor state and controls
 */
export function useEditorState({
  initialMetadata = {},
  onMetadataChange,
  iframeRef,
}: UseEditorStateProps = {}): UseEditorStateReturnType {
  // Initialize with default metadata if not provided
  const defaultMetadata: EditorMetadata = {
    outputs: [],
    mode: "editor", // Default to editor mode (previously code)
    ...initialMetadata,
  };

  const [metadata, setMetadataInternal] =
    useState<EditorMetadata>(defaultMetadata);

  // Wrapper for setMetadata to call onMetadataChange when it changes
  const setMetadata = useCallback(
    (updater: EditorMetadata | ((prev: EditorMetadata) => EditorMetadata)) => {
      setMetadataInternal((prev) => {
        const newMetadata =
          typeof updater === "function" ? updater(prev) : updater;

        // Call the onMetadataChange callback if provided
        if (onMetadataChange) {
          onMetadataChange(newMetadata);
        }

        return newMetadata;
      });
    },
    [onMetadataChange]
  );

  // Tab navigation functions
  const switchToEditorMode = useCallback(() => {
    console.log("Switching to editor mode");
    setMetadata((prev) => ({ ...prev, mode: "editor" }));
  }, [setMetadata]);

  const switchToPreviewMode = useCallback(() => {
    console.log("Switching to preview mode");
    setMetadata((prev) => ({ ...prev, mode: "preview" }));
  }, [setMetadata]);

  // ReactURL management
  useEffect(() => {
    // When the reactUrl changes and we have an iframe reference
    if (iframeRef?.current && metadata?.reactUrl) {
      try {
        // Set the src directly as a property only if different
        if (iframeRef.current.src !== metadata.reactUrl) {
          iframeRef.current.src = metadata.reactUrl;

          // Only auto-switch to preview mode when initially getting a reactUrl
          // This prevents overriding user's manual tab selection
          if (!metadata.previousReactUrl && metadata.mode !== "preview") {
            console.log(
              "Initial React URL detected, switching to preview mode"
            );
            setMetadata((prev) => ({
              ...prev,
              mode: "preview",
              previousReactUrl: metadata.reactUrl, // Track that we've seen this URL
            }));
          } else {
            // Just update the previousReactUrl without changing mode
            setMetadata((prev) => ({
              ...prev,
              previousReactUrl: metadata.reactUrl,
            }));
          }
        }
      } catch (err) {
        console.error("Error setting iframe src:", err);
      }
    }
  }, [
    metadata.reactUrl,
    iframeRef,
    setMetadata,
    metadata.previousReactUrl,
    metadata.mode,
  ]);

  // Computed properties for current state
  const isEditorMode = (metadata?.mode || "editor") === "editor";
  const isPreviewMode = (metadata?.mode || "editor") === "preview";

  return {
    metadata,
    setMetadata,
    switchToEditorMode,
    switchToPreviewMode,
    isEditorMode,
    isPreviewMode,
  };
}
