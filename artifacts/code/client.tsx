import { Artifact } from "@/components/create-artifact";
import { CodeEditor } from "@/components/code-editor";
import {
  CopyIcon,
  MessageIcon,
  RedoIcon,
  UndoIcon,
  CodeIcon,
} from "@/components/icons";
import { toast } from "sonner";
import { generateUUID } from "@/lib/utils";
import { useWebContainer } from "@/components/web-container-provider";
import { useEffect, useState, useRef } from "react";
import { executeReactComponent } from "./hooks/useReactExecution";

// Define simplified types to remove JavaScript execution specific types
interface ConsoleOutputContent {
  type: string;
  value: string;
}

interface ConsoleOutput {
  id: string;
  contents: Array<ConsoleOutputContent>;
  status: "in_progress" | "completed" | "failed";
}

interface Metadata {
  outputs: Array<ConsoleOutput>;
  reactUrl?: string;
  previousReactUrl?: string;
  mode?: "code" | "react";
}

export const codeArtifact = new Artifact<"code", Metadata>({
  kind: "code",
  description:
    "Useful for code generation; React components can be rendered in real-time.",
  initialize: async ({ setMetadata }) => {
    // Initialize with default metadata
    setMetadata((currentMetadata) => ({
      ...(currentMetadata || {}),
      outputs: [],
      mode: "code", // Default to code mode
    }));
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "code-delta") {
      const streamContent = (streamPart.content as string) || "";

      // Use a proper initialization if the content is empty or undefined
      const defaultContent =
        '// Write your React component code here\n// Click "Preview" to render';
      const content = streamContent.trim() ? streamContent : defaultContent;

      setArtifact((draftArtifact) => {
        // Preserve existing content if the new content is empty
        const newContent = content || draftArtifact.content || defaultContent;

        return {
          ...draftArtifact,
          content: newContent,
          isVisible: true,
          status: "streaming",
          kind: "code", // Ensure kind is always set
        };
      });
    }
  },
  content: ({ metadata, setMetadata, ...props }) => {
    // Default content for the editor
    const displayContent =
      props.content ||
      '// Enter your React component code here\n// Click "Preview" to render';

    // State to track active runner and execution
    const [runningCode, setRunningCode] = useState<{
      content: string;
      runId: string;
    } | null>(null);

    const {
      webcontainer,
      isLoading,
      error: containerError,
    } = useWebContainer();

    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Listen for code execution events
    useEffect(() => {
      const handleExecuteCode = (event: CustomEvent) => {
        const { runId, content } = event.detail;
        setRunningCode({ runId, content });
      };

      window.addEventListener(
        "execute-code",
        handleExecuteCode as EventListener
      );
      return () => {
        window.removeEventListener(
          "execute-code",
          handleExecuteCode as EventListener
        );
      };
    }, []);

    // Execute React code when running state changes
    useEffect(() => {
      async function executeCode() {
        if (!runningCode) return;

        try {
          if (isLoading) {
            // Wait for WebContainer to load
            return;
          }

          if (containerError || !webcontainer) {
            setMetadata((metadata) => ({
              ...metadata,
              outputs: [
                ...metadata.outputs.filter(
                  (output) => output.id !== runningCode.runId
                ),
                {
                  id: runningCode.runId,
                  contents: [
                    {
                      type: "text",
                      value: containerError || "WebContainer not available",
                    },
                  ],
                  status: "failed",
                },
              ],
            }));
            setRunningCode(null);
            return;
          }

          // Execute using React renderer
          setMetadata((metadata) => ({
            ...metadata,
            mode: "react",
            outputs: [
              ...metadata.outputs.filter(
                (output) => output.id !== runningCode.runId
              ),
              {
                id: runningCode.runId,
                contents: [
                  {
                    type: "text",
                    value: "Starting React component rendering...",
                  },
                ],
                status: "in_progress",
              },
            ],
          }));

          const result = await executeReactComponent(
            runningCode.content,
            webcontainer
          );

          if (result.error) {
            setMetadata((metadata) => ({
              ...metadata,
              outputs: [
                ...metadata.outputs.filter(
                  (output) => output.id !== runningCode.runId
                ),
                {
                  id: runningCode.runId,
                  contents: result.outputContent,
                  status: "failed",
                },
              ],
            }));
          } else {
            setMetadata((metadata) => ({
              ...metadata,
              reactUrl: result.url,
              outputs: [
                ...metadata.outputs.filter(
                  (output) => output.id !== runningCode.runId
                ),
                {
                  id: runningCode.runId,
                  contents: result.outputContent,
                  status: "completed",
                },
              ],
            }));

            // Set iframe src if available
            if (iframeRef.current && result.url) {
              iframeRef.current.src = result.url;
            }
          }

          // Clear running state
          setRunningCode(null);
        } catch (error: any) {
          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter(
                (output) => output.id !== runningCode.runId
              ),
              {
                id: runningCode.runId,
                contents: [{ type: "text", value: error.message }],
                status: "failed",
              },
            ],
          }));
          setRunningCode(null);
        }
      }

      executeCode();
    }, [runningCode, webcontainer, isLoading, containerError, setMetadata]);

    // WebContainer status display component
    const WebContainerStatus = () => {
      if (isLoading) {
        return (
          <div className="p-2 mb-3 rounded-lg overflow-hidden shadow-md border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/80 dark:to-blue-900/80">
            <div className="flex items-center">
              <div className="relative h-5 w-5 mr-2">
                <div className="absolute inset-0 rounded-full bg-blue-400/30 dark:bg-blue-500/30 animate-ping"></div>
                <svg
                  className="relative animate-spin w-5 h-5 text-blue-600 dark:text-blue-400"
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
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Initializing runtime environment...
              </span>
            </div>
          </div>
        );
      }

      if (containerError) {
        return (
          <div className="p-2 mb-3 rounded-lg overflow-hidden shadow-sm border border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/80 dark:to-red-900/80">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-600 dark:text-red-400 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                Runtime environment unavailable
              </span>
            </div>
          </div>
        );
      }

      return null;
    };

    // Add this effect to handle the iframe src properly
    useEffect(() => {
      // When the reactUrl changes and we have an iframe reference
      if (iframeRef.current && metadata?.reactUrl) {
        try {
          // Set the src directly as a property
          // Only set it if it's different from current src to avoid unnecessary reloads
          if (iframeRef.current.src !== metadata.reactUrl) {
            iframeRef.current.src = metadata.reactUrl;

            // Only auto-switch to React mode when initially getting a reactUrl
            // This prevents overriding user's manual tab selection
            if (!metadata.previousReactUrl && metadata.mode !== "react") {
              console.log(
                "Initial React URL detected, switching to React mode"
              );
              setMetadata((prev) => ({
                ...prev,
                mode: "react",
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
    }, [metadata?.reactUrl, setMetadata]);

    // Render the appropriate content based on the mode
    const renderContentByMode = () => {
      // Determine current mode - default to code mode if no mode is set
      const currentMode = metadata?.mode || "code";

      return (
        <div className="flex-1 relative h-full">
          {/* Editor */}
          <div
            className={`absolute inset-0 w-full h-full ${
              currentMode !== "react" ? "z-10" : "z-0"
            }`}
            style={{
              visibility: currentMode !== "react" ? "visible" : "hidden",
              pointerEvents: currentMode !== "react" ? "auto" : "none",
            }}
          >
            <CodeEditor {...props} content={displayContent} />
          </div>

          {/* Preview */}
          <div
            className={`absolute inset-0 w-full h-full ${
              currentMode === "react" ? "z-10" : "z-0"
            }`}
            style={{
              visibility: currentMode === "react" ? "visible" : "hidden",
              pointerEvents: currentMode === "react" ? "auto" : "none",
            }}
          >
            <div className="h-full w-full border border-border rounded-md overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              {!metadata?.reactUrl && (
                <div className="flex items-center justify-center h-full">
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
                      Run your code to see the live preview of your React
                      component
                    </p>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                title="React Component Preview"
                className="w-full h-full border-none"
                allow="clipboard-read; clipboard-write"
                key={`frame-${metadata?.reactUrl || "placeholder"}`}
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
              />
            </div>
          </div>
        </div>
      );
    };

    const switchToCodeMode = () => {
      console.log("Switching to code mode");
      setMetadata((prev) => ({ ...prev, mode: "code" }));
    };

    const switchToReactMode = () => {
      console.log("Switching to React mode");
      setMetadata((prev) => ({ ...prev, mode: "react" }));
    };

    return (
      <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        {/* Show WebContainer status information */}
        <WebContainerStatus />

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 px-4">
          <button
            onClick={switchToCodeMode}
            className={`px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center ${
              (metadata?.mode || "code") !== "react"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            <svg
              className="w-4 h-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            Editor
          </button>

          <button
            onClick={switchToReactMode}
            className={`px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center ${
              (metadata?.mode || "code") === "react"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
            disabled={!metadata?.reactUrl}
          >
            <svg
              className="w-4 h-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Preview
            {!metadata?.reactUrl && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                Run code first
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 p-4">{renderContentByMode()}</div>
      </div>
    );
  },
  actions: [
    {
      icon: <CodeIcon size={18} />,
      label: "Preview",
      description: "Render as a React component",
      onClick: ({ content, setMetadata }) => {
        const runId = generateUUID();

        // Set status for the new run
        setMetadata((metadata) => ({
          ...metadata,
          outputs: [
            ...metadata.outputs,
            {
              id: runId,
              contents: [],
              status: "in_progress",
            },
          ],
          // Set mode to react in advance
          mode: "react",
        }));

        // Dispatch custom event to trigger React rendering
        if (typeof window !== "undefined") {
          const event = new CustomEvent("execute-code", {
            detail: { runId, content },
          });
          window.dispatchEvent(event);
        }
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy code to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <MessageIcon />,
      description: "Tell the assistant to update this code",
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: "user",
          content: `Please update the code I shared with you.`,
        });
      },
    },
  ],
});
