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

// Function to detect if the code is a React component
function isReactComponentCode(code: string): boolean {
  // Look for common React patterns
  const reactIndicators = [
    /import\s+React/i, // Import React
    /import\s+{\s*.*\s*}\s+from\s+['"]react['"]/i, // Import from 'react'
    /export\s+default\s+\w+/i, // Export default component
    /class\s+\w+\s+extends\s+React\.Component/i, // Class component
    /function\s+\w+\s*\([^)]*\)\s*{\s*.*\breturn\s+</i, // Function component
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*</i, // Arrow function component
    /return\s*\(\s*<.*>\s*.*\s*<\/.*>\s*\)/is, // JSX in return
    /props\./i, // Props usage
    /useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef/i, // React hooks
    /<([A-Z][A-Za-z0-9]*)/i, // JSX with capital letter (custom component)
  ];

  // Count React patterns in the code
  let reactPatternCount = 0;
  for (const pattern of reactIndicators) {
    if (pattern.test(code)) {
      reactPatternCount++;
    }
  }

  // If we have 2 or more React patterns, it's likely a React component
  return reactPatternCount >= 2;
}

// React templates embedded directly - no server needed
const reactTemplateFiles = {
  // Basic React setup files
  "package.json": {
    file: {
      contents: JSON.stringify({
        name: "react-webcontainer",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite --port 3111",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "class-variance-authority": "^0.7.0",
          clsx: "^2.0.0",
          "tailwind-merge": "^2.0.0",
          "lucide-react": "^0.292.0",
          "tailwindcss-animate": "^1.0.7",
        },
        devDependencies: {
          "@types/node": "^20.8.10",
          "@types/react": "^18.2.15",
          "@types/react-dom": "^18.2.7",
          "@vitejs/plugin-react": "^4.0.3",
          autoprefixer: "^10.4.16",
          postcss: "^8.4.31",
          tailwindcss: "^3.3.5",
          typescript: "^5.0.2",
          vite: "^4.4.5",
        },
      }),
    },
  },
  "vite.config.js": {
    file: {
      contents: `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3111,
    hmr: {
      clientPort: 3111
    }
  },
});
`,
    },
  },
  "src/main.jsx": {
    file: {
      contents: `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
    },
  },
  "src/App.jsx": {
    file: {
      contents: `
import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-6 bg-white border rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-4">React in WebContainer</h1>
        <p className="text-gray-500 mb-4">This is a simple React app running in a WebContainer</p>
        
        <div className="flex flex-col gap-4">
          <p className="text-center text-2xl font-bold">{count}</p>
          <div className="flex gap-4">
            <button 
              onClick={() => setCount(count - 1)}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Decrement
            </button>
            <button 
              onClick={() => setCount(count + 1)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Increment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
`,
    },
  },
  "src/App.css": {
    file: {
      contents: `
/* App-specific styles */
`,
    },
  },
  "src/index.css": {
    file: {
      contents: `
@tailwind base;
@tailwind components;
@tailwind utilities;
 
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
 
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
 
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
 
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
 
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
 
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
 
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
 
    --radius: 0.5rem;
  }
}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`,
    },
  },
  "index.html": {
    file: {
      contents: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React in WebContainer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    },
  },
  "tailwind.config.js": {
    file: {
      contents: `
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
`,
    },
  },
  "postcss.config.js": {
    file: {
      contents: `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,
    },
  },
};

// Execute a React component in WebContainer
async function executeReactComponent(
  code: string,
  webcontainer: any
): Promise<{
  url: string;
  outputContent: Array<ConsoleOutputContent>;
  error?: string;
}> {
  const outputContent: Array<ConsoleOutputContent> = [];

  try {
    if (!webcontainer) {
      throw new Error("WebContainer is not available");
    }

    outputContent.push({
      type: "text",
      value: "🔄 Setting up React environment...",
    });

    // Extract component name from the code
    let componentName = "MyComponent";
    const componentNameMatch = code.match(
      /function\s+(\w+)|class\s+(\w+)|const\s+(\w+)\s*=/
    );
    if (componentNameMatch) {
      componentName =
        componentNameMatch[1] || componentNameMatch[2] || componentNameMatch[3];
    }

    // Create directories first - more reliable than mounting with nested paths
    try {
      // Create root-level files first
      await webcontainer.mount({
        "package.json": reactTemplateFiles["package.json"],
        "vite.config.js": reactTemplateFiles["vite.config.js"],
        "index.html": reactTemplateFiles["index.html"],
        "tailwind.config.js": reactTemplateFiles["tailwind.config.js"],
        "postcss.config.js": reactTemplateFiles["postcss.config.js"],
      });

      outputContent.push({
        type: "text",
        value: "📦 Root files mounted",
      });

      // Explicitly create src directory
      await webcontainer.fs.mkdir("src", { recursive: true });

      // Add src files one by one
      await webcontainer.fs.writeFile(
        "src/main.jsx",
        reactTemplateFiles["src/main.jsx"].file.contents
      );
      await webcontainer.fs.writeFile(
        "src/App.jsx",
        reactTemplateFiles["src/App.jsx"].file.contents
      );
      await webcontainer.fs.writeFile(
        "src/App.css",
        reactTemplateFiles["src/App.css"].file.contents
      );
      await webcontainer.fs.writeFile(
        "src/index.css",
        reactTemplateFiles["src/index.css"].file.contents
      );

      outputContent.push({
        type: "text",
        value: "📦 Source files created successfully",
      });
    } catch (error: any) {
      console.error("Error setting up file structure:", error);
      outputContent.push({
        type: "text",
        value: `🚫 Error setting up file structure: ${error.message}`,
      });
      throw error;
    }

    // Create components directory
    try {
      await webcontainer.fs.mkdir("src/components", { recursive: true });
    } catch (error) {
      console.error("Error creating components directory:", error);
      // Directory might already exist, ignore
    }

    // Write the component to a file
    try {
      await webcontainer.fs.writeFile(
        `src/components/${componentName}.jsx`,
        code
      );
      outputContent.push({
        type: "text",
        value: `✅ Created component: ${componentName}`,
      });
    } catch (error: any) {
      console.error("Error writing component file:", error);
      outputContent.push({
        type: "text",
        value: `🚫 Error writing component: ${error.message}`,
      });
      throw error;
    }

    // Update App.jsx to import and use the component
    const appCode = `
import { useState } from 'react';
import './App.css';
import ${componentName} from './components/${componentName}';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl mb-8">
        <${componentName} />
      </div>
      
      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
        <p>React component rendered in WebContainer</p>
      </div>
    </div>
  );
}

export default App;
`;

    try {
      await webcontainer.fs.writeFile("src/App.jsx", appCode);
      outputContent.push({
        type: "text",
        value: "📝 Updated App.jsx to use your component",
      });
    } catch (error: any) {
      console.error("Error updating App.jsx:", error);
      outputContent.push({
        type: "text",
        value: `🚫 Error updating App.jsx: ${error.message}`,
      });
      throw error;
    }

    // Install dependencies
    outputContent.push({
      type: "text",
      value: "📦 Installing dependencies (this may take a moment)...",
    });

    try {
      const installProcess = await webcontainer.spawn("npm", ["install"]);

      // Log installation output
      const installLogCollector = new WritableStream({
        write(chunk) {
          const output = chunk.toString();
          console.log("[Install]", output);

          // Only add significant log lines to the output to avoid flooding
          if (
            output.includes("added") ||
            output.includes("error") ||
            output.includes("Done") ||
            output.includes("npm ERR!")
          ) {
            outputContent.push({
              type: "text",
              value: output,
            });
          }
        },
      });

      installProcess.output.pipeTo(installLogCollector);
      const installExitCode = await installProcess.exit;

      if (installExitCode !== 0) {
        throw new Error(
          `Installation failed with exit code ${installExitCode}`
        );
      }

      outputContent.push({
        type: "text",
        value: "✅ Dependencies installed successfully",
      });
    } catch (error: any) {
      console.error("Error installing dependencies:", error);
      outputContent.push({
        type: "text",
        value: `🚫 Error installing dependencies: ${error.message}`,
      });
      throw error;
    }

    // Start the Vite dev server
    outputContent.push({
      type: "text",
      value: "🚀 Starting React development server...",
    });

    try {
      // Create a promise that will be resolved when we get the server URL
      let resolveUrlPromise: (url: string) => void;
      let rejectUrlPromise: (error: Error) => void;

      const urlPromise = new Promise<string>((resolve, reject) => {
        resolveUrlPromise = resolve;
        rejectUrlPromise = reject;
      });

      // Set a timeout in case we don't get the server-ready event
      let timeoutId = setTimeout(() => {
        console.warn(
          "⚠️ Server-ready event timeout - falling back to alternatives"
        );
        // Don't reject yet - we'll try fallback mechanisms
      }, 15000);

      // Start the dev server
      const devProcess = await webcontainer.spawn("npm", ["run", "dev"]);
      console.log("🚀 Dev server started");

      // Get server output for debugging and fallback URL detection
      const outputChunks: string[] = [];

      // Process the output to collect it and look for URLs as a fallback
      devProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            const output = chunk.toString();
            outputChunks.push(output);

            // Format the output to make it more readable
            // Filter out Go stack traces and complex esbuild errors
            if (isGoStackTrace(output)) {
              // For Go stack traces (from esbuild), provide a simplified error message
              outputContent.push({
                type: "text",
                value:
                  "⚠️ Build error from esbuild (internal error simplified):",
              });

              // Try to extract a more readable error message
              const errorMessage = extractErrorMessage(output);
              if (errorMessage) {
                outputContent.push({
                  type: "text",
                  value: `Error: ${errorMessage}`,
                });
              } else {
                outputContent.push({
                  type: "text",
                  value:
                    "A build error occurred. Please check your code for syntax errors.",
                });
              }
            } else {
              // For normal output, display it directly
              outputContent.push({
                type: "text",
                value: output,
              });
            }
          },
        })
      );

      // Try to use the server-ready event if available
      if (typeof webcontainer.on === "function") {
        console.log("✅ Using server-ready event listener approach");

        // The proper way to listen for the server-ready event
        webcontainer.on("server-ready", (port: number, url: string) => {
          console.log(`🎯 Server ready on port ${port} at ${url}`);
          clearTimeout(timeoutId);

          outputContent.push({
            type: "text",
            value: `🌐 Server ready at: ${url}`,
          });

          resolveUrlPromise(url);
        });
      } else {
        console.warn(
          "⚠️ server-ready event not available, using fallback methods"
        );

        // Fallback 1: Try to use network.getUrl() API
        if (
          webcontainer.network &&
          typeof webcontainer.network.getUrl === "function"
        ) {
          // Wait a bit for the server to start
          setTimeout(async () => {
            try {
              // Try to get a URL using the network API
              const url = await webcontainer.network.getUrl();
              console.log("🔄 Found URL via network API:", url);

              if (url) {
                clearTimeout(timeoutId);
                outputContent.push({
                  type: "text",
                  value: `🌐 Server ready at: ${url}`,
                });
                resolveUrlPromise(url);
              }
            } catch (err) {
              console.error("❌ Error getting URL from network API:", err);
              // We'll continue with other fallbacks
            }
          }, 5000);
        }

        // Fallback 2: Extract URL from server output
        setTimeout(() => {
          const allOutput = outputChunks.join("\n");
          const urlMatch = allOutput.match(
            /Local:\s+(https?:\/\/localhost:\d+)/
          );

          if (urlMatch && urlMatch[1]) {
            const url = urlMatch[1].trim();
            console.log("🔄 Extracted URL from server output:", url);

            clearTimeout(timeoutId);
            outputContent.push({
              type: "text",
              value: `🌐 Server ready at: ${url} (extracted from logs)`,
            });
            resolveUrlPromise(url);
          } else {
            // Fallback 3: Default to standard localhost:3000
            console.warn("⚠️ Using default URL fallback");
            const defaultUrl = "http://localhost:3000";

            outputContent.push({
              type: "text",
              value: `⚠️ Could not detect server URL, trying default: ${defaultUrl}`,
            });
            resolveUrlPromise(defaultUrl);
          }
        }, 10000);
      }

      // Set up a final timeout to avoid hanging forever
      const hardTimeoutId = setTimeout(() => {
        rejectUrlPromise(
          new Error(
            "Server startup timeout - server may be running but URL could not be determined"
          )
        );
      }, 60000); // 1 minute max timeout

      try {
        // Wait for the URL promise to resolve
        const serverUrl = await urlPromise;
        clearTimeout(hardTimeoutId);

        return { url: serverUrl, outputContent };
      } catch (error: any) {
        console.error("❌ Error waiting for server URL:", error);
        clearTimeout(hardTimeoutId);

        outputContent.push({
          type: "text",
          value: `🚫 Error waiting for server URL: ${error.message}`,
        });
        throw error;
      }
    } catch (error: any) {
      console.error("Error starting dev server:", error);
      outputContent.push({
        type: "text",
        value: `🚫 Error starting dev server: ${error.message}`,
      });
      throw error;
    }
  } catch (error: any) {
    const errorMsg = error.message || "Error executing React component";
    console.error("React execution error:", error);
    outputContent.push({
      type: "text",
      value: `🚫 Error: ${errorMsg}`,
    });
    return { url: "", outputContent, error: errorMsg };
  }
}

// Helper function to detect Go stack traces
function isGoStackTrace(output: string): boolean {
  return (
    output.includes("goroutine") &&
    (output.includes("github.com/evanw/esbuild") ||
      output.includes("runtime.gopark") ||
      output.includes("runtime/proc.go"))
  );
}

// Function to extract a meaningful error message from a stack trace
function extractErrorMessage(stackTrace: string): string | null {
  // Try to find error messages in the stack trace
  const errorMatches = stackTrace.match(/Error: (.*?)($|\n)/);
  if (errorMatches && errorMatches[1]) {
    return errorMatches[1].trim();
  }

  // Try to find the first meaningful line that might indicate the error
  const lines = stackTrace.split("\n");
  for (const line of lines) {
    // Skip lines that are just stack frame information
    if (
      line.includes("at ") ||
      line.includes("goroutine") ||
      line.match(/^\s*$/)
    ) {
      continue;
    }

    // If we find a meaningful line, return it
    if (line.trim()) {
      return line.trim();
    }
  }

  return null;
}

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
