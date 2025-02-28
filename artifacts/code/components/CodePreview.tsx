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

    const handleRunPreview = () => {
      const previewButton = document.querySelector(
        'button[title*="Preview your React component"]'
      );
      if (previewButton instanceof HTMLButtonElement) {
        previewButton.click();
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
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 backdrop-blur-sm">
                <div className="flex flex-col items-center p-6 rounded-xl">
                  <div className="relative w-12 h-12 mb-4">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
                    <svg
                      className="relative animate-spin h-12 w-12 text-blue-600 dark:text-blue-400"
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
                  </div>
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Rendering your component...
                  </span>
                </div>
              </div>
            )}
            <iframe
              ref={ref}
              src={reactUrl}
              className="w-full h-full border-0 rounded-lg shadow-lg transition-all duration-300 bg-white"
              sandbox="allow-scripts allow-forms allow-same-origin"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="React Preview"
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-center p-8 max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
                No preview available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Run your code to see the live preview of your React component
              </p>
              <div className="inline-block relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-70 blur-xl"></div>
                <button
                  className="relative px-6 py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300 text-lg"
                  onClick={handleRunPreview}
                >
                  Run Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

CodePreview.displayName = "CodePreview";

export default CodePreview;
