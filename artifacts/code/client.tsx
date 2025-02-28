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
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-md mb-3 text-sm text-center">
            Initializing runtime environment...
          </div>
        );
      }

      if (containerError) {
        return (
          <div className="p-2 bg-red-50 border border-red-100 rounded-md mb-3 text-sm text-center">
            Runtime environment unavailable
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
            <div className="h-full w-full border border-border rounded-md overflow-hidden">
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
      <div className="w-full h-full flex flex-col">
        {/* Show WebContainer status information */}
        <WebContainerStatus />

        {/* Tab navigation */}
        <div className="flex border-b mb-3">
          <button
            onClick={switchToCodeMode}
            className={`px-4 py-2 text-sm font-medium ${
              (metadata?.mode || "code") !== "react"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Editor
          </button>

          <button
            onClick={switchToReactMode}
            className={`px-4 py-2 text-sm font-medium ${
              (metadata?.mode || "code") === "react"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            disabled={!metadata?.reactUrl}
          >
            Preview
          </button>
        </div>

        {renderContentByMode()}
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
