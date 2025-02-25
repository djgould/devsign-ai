"use client";

import { EditorView } from "@codemirror/view";
import { EditorState, Transaction } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup } from "codemirror";
import React, { memo, useEffect, useRef, useState } from "react";
import { Suggestion } from "@/lib/db/schema";

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: "streaming" | "idle";
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<Suggestion>;
};

function PureCodeEditor({ content, onSaveContent, status }: EditorProps) {
  const editorRef = useRef<EditorView>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Default content if none is provided
  const defaultContent =
    '// Write your JavaScript code here\nconsole.log("Hello, world!");';
  const displayContent = content || defaultContent;

  // Initialize editor on mount
  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      try {
        const extensions = [
          basicSetup,
          javascript({ jsx: true, typescript: true }), // Enable JSX and TypeScript syntax
          oneDark,
          EditorState.tabSize.of(4),
          EditorView.theme({
            "&": {
              height: "100%",
              minHeight: "400px",
            },
            "&.cm-editor.cm-focused": {
              outline: "none",
            },
            ".cm-content": {
              fontFamily: "monospace",
              fontSize: "16px",
              lineHeight: "1.6",
              padding: "10px 0",
            },
            ".cm-line": {
              padding: "0 10px",
            },
            ".cm-gutters": {
              backgroundColor: "var(--background)",
              color: "var(--muted-foreground)",
              border: "none",
            },
            ".cm-activeLineGutter": {
              backgroundColor: "rgba(var(--primary), 0.1)",
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const transaction = update.transactions.find(
                (tr) => !tr.annotation(Transaction.remote)
              );

              if (transaction) {
                const newValue = update.state.doc.toString();
                onSaveContent(newValue, true);
              }
            }
          }),
        ];

        const startState = EditorState.create({
          doc: displayContent,
          extensions,
        });

        editorRef.current = new EditorView({
          state: startState,
          parent: containerRef.current,
        });

        setIsEditorReady(true);

        // Force save initial content if needed
        if (!content) {
          onSaveContent(defaultContent, false);
        }
      } catch (error) {
        console.error("Error initializing editor:", error);
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = undefined;
      }
    };
  }, []);

  // Update editor content when it changes
  useEffect(() => {
    if (editorRef.current && isEditorReady) {
      const currentContent = editorRef.current.state.doc.toString();

      // Only update if content actually changed and not empty
      if (
        (status === "streaming" || currentContent !== displayContent) &&
        displayContent
      ) {
        try {
          const transaction = editorRef.current.state.update({
            changes: {
              from: 0,
              to: currentContent.length,
              insert: displayContent,
            },
            annotations: [Transaction.remote.of(true)],
          });

          editorRef.current.dispatch(transaction);
        } catch (error) {
          console.error("Error updating editor content:", error);
        }
      }
    }
  }, [content, status, isEditorReady, displayContent]);

  // Debugging output for development
  const debugInfo =
    process.env.NODE_ENV === "development" ? (
      <div className="text-xs text-muted-foreground p-1 bg-muted mb-1">
        Editor ready: {isEditorReady ? "Yes" : "No"}, Has content:{" "}
        {content ? "Yes" : "No"}, Length: {content?.length || 0}
      </div>
    ) : null;

  return (
    <div className="flex flex-col w-full h-full">
      {debugInfo}
      <div
        className="h-full min-h-[400px] w-full border border-border rounded-md overflow-hidden"
        ref={containerRef}
      />
    </div>
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  if (prevProps.suggestions !== nextProps.suggestions) return false;
  if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex)
    return false;
  if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false;
  if (prevProps.status === "streaming" && nextProps.status === "streaming")
    return false;
  if (prevProps.content !== nextProps.content) return false;

  return true;
}

export const CodeEditor = memo(PureCodeEditor, areEqual);
