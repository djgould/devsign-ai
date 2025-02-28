import React, { forwardRef, useEffect, useState, Ref } from "react";
import { EditorMode } from "../hooks/useEditorState";

interface CodePreviewProps {
  reactUrl?: string;
  currentMode: EditorMode;
  onError?: (error: string) => void;
}

/**
 * Component that displays a rendered React preview in an iframe
 *
 * @param {CodePreviewProps} props - The component props
 * @returns {React.ReactNode} The preview component
 */
const CodePreview = forwardRef(
  (
    { reactUrl, currentMode, onError }: CodePreviewProps,
    ref: Ref<HTMLIFrameElement>
  ) => {
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const isVisible = currentMode === "preview";

    // Reset the loaded state when the URL changes
    useEffect(() => {
      setIframeLoaded(false);
    }, [reactUrl]);

    const handleIframeLoad = () => {
      setIframeLoaded(true);
    };

    const handleIframeError = () => {
      if (onError) {
        onError("Failed to load preview. The content might contain errors.");
      }
    };

    // Using visibility instead of conditional rendering to maintain iframe state
    return (
      <div
        className={`w-full h-full relative ${isVisible ? "z-10" : "z-0"}`}
        style={{
          visibility: isVisible ? "visible" : "hidden",
          pointerEvents: isVisible ? "auto" : "none",
        }}
      >
        {reactUrl ? (
          <>
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Loading preview...</span>
                </div>
              </div>
            )}
            <iframe
              ref={ref}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-forms allow-same-origin"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="React Preview"
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="mb-2">No preview available</p>
              <p className="text-sm">Run your code to see the preview</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

CodePreview.displayName = "CodePreview";

export default CodePreview;
