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
import React, { useEffect, useState, useRef, memo, forwardRef } from "react";

// Create a memoized iframe component to prevent re-renders
const MemoizedIframe = memo(
  forwardRef<HTMLIFrameElement, React.IframeHTMLAttributes<HTMLIFrameElement>>(
    (props, ref) => <iframe ref={ref} {...props} key="stable-iframe-key" />
  )
);

// Create a memoized container for the iframe that only depends on reactUrl
const IframeContainer = memo(
  ({ reactUrl }: { reactUrl?: string }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Update iframe src when reactUrl changes
    useEffect(() => {
      if (iframeRef.current && reactUrl) {
        try {
          if (iframeRef.current.src !== reactUrl) {
            iframeRef.current.src = reactUrl;
          }
        } catch (err) {
          console.error("Error setting iframe src:", err);
        }
      }
    }, [reactUrl]);

    return (
      <MemoizedIframe
        ref={iframeRef}
        title="React Component Preview"
        className="w-full h-full border-none"
        allow="clipboard-read; clipboard-write"
        key="stable-iframe-key"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
      />
    );
  },
  // Custom comparison function that only checks if reactUrl has changed
  (prevProps, nextProps) => {
    return prevProps.reactUrl === nextProps.reactUrl;
  }
);

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
  mode?: "editor" | "preview";
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
      mode: "preview", // Default to preview mode for better UX
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
    // Add animation styles
    useEffect(() => {
      // Add CSS animation for progress bar and loader
      const style = document.createElement("style");
      style.textContent = `
        @keyframes progress {
          0% { width: 0%; }
          20% { width: 20%; }
          40% { width: 40%; }
          60% { width: 60%; }
          80% { width: 80%; }
          100% { width: 20%; }
        }
        .animate-progress {
          animation: progress 10s ease-in-out infinite;
        }
        
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 20px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .pulse-animation {
          animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        }
        
        .fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        
        .shimmer {
          background: linear-gradient(90deg, 
            rgba(255,255,255,0) 0%, 
            rgba(255,255,255,0.08) 50%, 
            rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite;
        }

        .shimmer-dark {
          background: linear-gradient(90deg, 
            rgba(30,41,59,0) 0%, 
            rgba(30,41,59,0.15) 50%, 
            rgba(30,41,59,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }, []);

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

    // Track the WebContainer initialization stage
    const [containerStatus, setContainerStatus] =
      useState<string>("initializing");

    // Effect to track WebContainer initialization stages
    useEffect(() => {
      if (containerError) {
        setContainerStatus("error");
      } else if (!isLoading && webcontainer) {
        setContainerStatus("ready");
      } else if (isLoading) {
        // Simulate staged loading process
        const stages = [
          "initializing environment",
          "installing dependencies",
          "preparing server",
          "almost ready",
        ];

        let currentStage = 0;
        const interval = setInterval(() => {
          setContainerStatus(stages[currentStage]);
          currentStage = (currentStage + 1) % stages.length;
        }, 2500);

        return () => clearInterval(interval);
      }
    }, [isLoading, webcontainer, containerError]);

    // Auto-execute on initial load if we have content and no reactUrl yet
    useEffect(() => {
      console.log("useeffect");
      // Only auto-execute if:
      // 1. WebContainer is ready
      // 2. We have content to run
      // 3. No preview URL exists yet
      // 4. We're not already running code
      if (
        webcontainer &&
        !isLoading &&
        !containerError &&
        props.content &&
        metadata &&
        !metadata.reactUrl &&
        !runningCode
      ) {
        const autoRunId = generateUUID();
        setRunningCode({ runId: autoRunId, content: props.content });
      }
    }, [
      webcontainer,
      isLoading,
      containerError,
      props.content,
      metadata,
      metadata?.reactUrl,
      runningCode,
    ]);

    // Listen for code execution events
    useEffect(() => {
      const handleExecuteCode = (event: CustomEvent) => {
        const { runId, content } = event.detail;
        console.log("runId", runId);
        console.log("content", content);
        if (runId === runningCode?.runId && content === runningCode?.content)
          return;
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
        if (!metadata) return; // Return early if metadata is null

        try {
          if (isLoading) {
            // Wait for WebContainer to load
            return;
          }

          if (containerError || !webcontainer) {
            setMetadata((metadata) => {
              if (!metadata) return { outputs: [], mode: "editor" }; // Initialize metadata if null

              return {
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
              };
            });
            setRunningCode(null);
            return;
          }

          // Execute using React renderer
          setMetadata((metadata) => {
            if (!metadata) return { outputs: [], mode: "preview" }; // Initialize metadata if null

            return {
              ...metadata,
              mode: "preview",
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
            };
          });

          setContainerStatus("preparing component");

          // Add progress updates
          const updateProgressStatus = (status: string) => {
            setContainerStatus(status);
            setMetadata((metadata) => {
              if (!metadata)
                return {
                  outputs: [
                    {
                      id: runningCode.runId,
                      contents: [{ type: "text", value: status }],
                      status: "in_progress",
                    },
                  ],
                  mode: "preview",
                };

              return {
                ...metadata,
                outputs: [
                  ...metadata.outputs.filter(
                    (output) => output.id !== runningCode.runId
                  ),
                  {
                    id: runningCode.runId,
                    contents: [
                      ...(metadata.outputs.find(
                        (o) => o.id === runningCode.runId
                      )?.contents || []),
                      { type: "text", value: status },
                    ],
                    status: "in_progress",
                  },
                ],
              };
            });
          };

          const result = await executeReactComponent(
            runningCode.content,
            webcontainer,
            updateProgressStatus
          );

          if (result.error) {
            setContainerStatus("error");
            setMetadata((metadata) => {
              if (!metadata) return { outputs: [], mode: "editor" }; // Initialize metadata if null

              return {
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
              };
            });
          } else {
            setMetadata((metadata) => {
              if (!metadata)
                return {
                  outputs: [
                    {
                      id: runningCode.runId,
                      contents: result.outputContent,
                      status: "completed",
                    },
                  ],
                  mode: "preview",
                  reactUrl: result.url,
                }; // Initialize metadata if null

              return {
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
              };
            });

            setContainerStatus("preview ready");
          }

          // Clear running state
          setRunningCode(null);
        } catch (error: any) {
          setMetadata((metadata) => {
            if (!metadata) return { outputs: [], mode: "editor" }; // Initialize metadata if null

            return {
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
            };
          });
          setRunningCode(null);
        }
      }

      executeCode();
    }, [runningCode, webcontainer, isLoading, containerError, setMetadata]);

    // Handle mode switching when reactUrl is first received
    useEffect(() => {
      // Only proceed if we have metadata and a reactUrl
      if (!metadata || !metadata.reactUrl) return;

      // Only auto-switch to preview mode when initially getting a reactUrl
      // This prevents overriding user's manual tab selection
      if (!metadata.previousReactUrl && metadata.mode !== "preview") {
        console.log("Initial React URL detected, switching to preview mode");
        setMetadata((prev) => ({
          ...prev,
          mode: "preview",
          previousReactUrl: metadata.reactUrl, // Track that we've seen this URL
        }));
      } else if (metadata.reactUrl !== metadata.previousReactUrl) {
        // Just update the previousReactUrl without changing mode
        setMetadata((prev) => ({
          ...prev,
          previousReactUrl: metadata.reactUrl,
        }));
      }
    }, [
      metadata?.reactUrl,
      metadata?.previousReactUrl,
      metadata?.mode,
      setMetadata,
    ]);

    // Render the appropriate content based on the mode
    const renderContentByMode = () => {
      // Safely handle cases where metadata might be null
      if (!metadata) {
        // Return a default view when metadata is null
        return (
          <div className="flex-1 relative h-full">
            <div className="absolute inset-0 w-full h-full z-10">
              <CodeEditor {...props} content={displayContent} />
            </div>
          </div>
        );
      }

      // Determine current mode - default to editor mode if no mode is set
      const currentMode = metadata?.mode || "editor";

      return (
        <div className="flex-1 relative h-full">
          {/* Editor */}
          <div
            className={`absolute inset-0 w-full h-full ${
              currentMode !== "preview" ? "z-10" : "z-0"
            }`}
            style={{
              visibility: currentMode !== "preview" ? "visible" : "hidden",
              pointerEvents: currentMode !== "preview" ? "auto" : "none",
            }}
          >
            <CodeEditor {...props} content={displayContent} />
          </div>

          {/* Preview */}
          <div
            className={`absolute inset-0 w-full h-full ${
              currentMode === "preview" ? "z-10" : "z-0"
            }`}
            style={{
              visibility: currentMode === "preview" ? "visible" : "hidden",
              pointerEvents: currentMode === "preview" ? "auto" : "none",
            }}
          >
            <div className="h-full w-full border border-border rounded-md overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              {!metadata?.reactUrl && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8 max-w-md w-full fade-in-up">
                    {/* Loading/No Preview State */}
                    {isLoading || runningCode ? (
                      <div className="relative bg-gray-50/90 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden p-6 border border-gray-100/50 dark:border-gray-700/30">
                        {/* Animated background effect */}
                        <div className="absolute inset-0 opacity-10 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-100 dark:from-blue-900 dark:via-indigo-900 dark:to-blue-900 dark:opacity-30 shimmer-dark"></div>
                          <div className="absolute h-40 w-40 rounded-full bg-blue-400/10 dark:bg-blue-400/5 -top-20 -left-20 blur-3xl"></div>
                          <div className="absolute h-40 w-40 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 -bottom-20 -right-20 blur-3xl"></div>
                        </div>

                        {/* Loading Icon */}
                        <div className="relative mb-6 flex justify-center">
                          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center pulse-animation">
                            <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center relative">
                              <svg
                                className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin"
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
                                  strokeWidth="3"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              {runningCode && (
                                <div
                                  className="absolute inset-0 rounded-full border-2 border-blue-500 dark:border-blue-400 border-dashed animate-spin"
                                  style={{ animationDuration: "10s" }}
                                ></div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Text */}
                        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 relative z-10">
                          {isLoading && !runningCode
                            ? "Preparing Environment"
                            : "Rendering Your Component"}
                        </h3>

                        {/* Status Message */}
                        <div className="mb-6 relative z-10">
                          <div className="flex items-center justify-center mb-2">
                            <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">
                              {containerStatus}
                            </span>
                            <span className="inline-flex ml-2">
                              <span
                                className="w-1 h-1 bg-blue-600 dark:bg-blue-300 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              ></span>
                              <span
                                className="w-1 h-1 mx-1 bg-blue-600 dark:bg-blue-300 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></span>
                              <span
                                className="w-1 h-1 bg-blue-600 dark:bg-blue-300 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></span>
                            </span>
                          </div>

                          {/* Progress Bar with smoother and more accurate appearance */}
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 h-full rounded-full animate-progress"></div>
                          </div>

                          {/* Status Logs */}
                          {metadata?.outputs?.length > 0 &&
                            metadata.outputs[metadata.outputs.length - 1]
                              ?.contents?.length > 0 && (
                              <div className="text-left mt-4 text-sm text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-800/90 p-3 rounded-lg max-h-24 overflow-y-auto border border-gray-200 dark:border-gray-700 font-mono">
                                {metadata.outputs[
                                  metadata.outputs.length - 1
                                ].contents
                                  .slice(-3)
                                  .map((content, i) => (
                                    <div
                                      key={i}
                                      className="mb-1.5 flex items-start"
                                    >
                                      <span className="text-blue-600 dark:text-blue-300 mr-2">
                                        »
                                      </span>
                                      <span>{content.value}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                        </div>

                        {/* Error message if there's a container error */}
                        {containerError && (
                          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-3 text-sm">
                            <p className="font-semibold mb-1">Error</p>
                            <p className="text-red-700 dark:text-red-200">
                              {containerError}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 px-6 bg-gray-50/90 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 dark:border-gray-700/30">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 mb-6">
                          <svg
                            className="w-10 h-10 text-blue-600 dark:text-blue-300"
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

                        <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                          No preview available
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                          Run your code to see the live preview of your React
                          component
                        </p>

                        <button
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:translate-y-[-2px] transition-all duration-300 text-base"
                          onClick={() => {
                            const runId = generateUUID();
                            setRunningCode({
                              runId,
                              content: props.content || displayContent,
                            });
                          }}
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Run Preview
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <IframeContainer reactUrl={metadata?.reactUrl} />
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <div className="flex-1 p-4">{renderContentByMode()}</div>
      </div>
    );
  },
  actions: [
    {
      icon: <CodeIcon size={18} />,
      label: "Editor",
      description: "View the code editor",
      onClick: ({ content, setMetadata }) => {
        const runId = generateUUID();

        // Set status for the new run
        setMetadata((metadata) => {
          if (!metadata)
            return {
              outputs: [
                {
                  id: runId,
                  contents: [],
                  status: "in_progress",
                },
              ],
              mode: "editor",
              isDisabled: true,
            }; // Initialize metadata if null

          return {
            ...metadata,
            outputs: [
              ...metadata.outputs,
              {
                id: runId,
                contents: [],
                status: "in_progress",
              },
            ],
            // Set mode to preview in advance
            mode: "editor",
          };
        });
      },
      isDisabled: ({ metadata }) => {
        if (!metadata) return false;
        return metadata.mode === "editor";
      },
    },
    {
      icon: <CodeIcon size={18} />,
      label: "Preview",
      description: "Render as a React component",
      onClick: ({ content, setMetadata }) => {
        const runId = generateUUID();

        // Set status for the new run
        setMetadata((metadata) => {
          if (!metadata)
            return {
              outputs: [
                {
                  id: runId,
                  contents: [],
                  status: "in_progress",
                },
              ],
              mode: "preview",
            }; // Initialize metadata if null

          return {
            ...metadata,
            outputs: [
              ...metadata.outputs,
              {
                id: runId,
                contents: [],
                status: "in_progress",
              },
            ],
            // Set mode to preview in advance
            mode: "preview",
          };
        });
      },
      isDisabled: ({ metadata }) => {
        if (!metadata) return false;
        return metadata.mode === "preview";
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
