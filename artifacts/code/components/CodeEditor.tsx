import React, { useRef, useState, useEffect } from "react";
import { EditorMode } from "../hooks/useEditorState";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup } from "codemirror";

interface CodeEditorProps {
  content: string;
  onChange: (value: string) => void;
  currentMode: EditorMode;
  isWebContainerReady: boolean;
  onExecute: () => void;
}

/**
 * Component that provides a code editor for writing React components
 *
 * @param {CodeEditorProps} props - The component props
 * @returns {React.ReactNode} The editor component
 */
const CodeEditor: React.FC<CodeEditorProps> = ({
  content,
  onChange,
  currentMode,
  isWebContainerReady,
  onExecute,
}) => {
  const isVisible = currentMode === "editor";
  const editorRef = useRef<EditorView>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Default content if none is provided
  const defaultContent =
    "// Write your React component here\nfunction MyComponent() {\n  return <div>Hello World</div>;\n}\n\nexport default MyComponent;";
  const displayContent = content || defaultContent;

  // Initialize editor on mount
  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      try {
        // Set up the editor with JavaScript/JSX support
        const startState = EditorState.create({
          doc: displayContent,
          extensions: [
            basicSetup,
            javascript({ jsx: true }),
            oneDark,
            EditorState.tabSize.of(2),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                const newContent = update.state.doc.toString();
                onChange(newContent);
              }
            }),
          ],
        });

        editorRef.current = new EditorView({
          state: startState,
          parent: containerRef.current,
        });

        setIsEditorReady(true);
      } catch (error) {
        console.error("Error initializing editor:", error);
      }
    }

    // Clean up on unmount
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = undefined;
      }
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl+Enter or Cmd+Enter was pressed
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (isWebContainerReady) {
          onExecute();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWebContainerReady, onExecute]);

  return (
    <div
      className={`w-full h-full relative ${isVisible ? "z-10" : "z-0"}`}
      style={{
        visibility: isVisible ? "visible" : "hidden",
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute bottom-4 right-4">
        <button
          className={`px-4 py-2 text-white rounded-md ${
            isWebContainerReady
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          onClick={onExecute}
          disabled={!isWebContainerReady}
          title={
            isWebContainerReady
              ? "Preview your React component (Ctrl+Enter)"
              : "Waiting for runtime environment to initialize..."
          }
        >
          Preview
        </button>
      </div>
    </div>
  );
};

export default CodeEditor;
