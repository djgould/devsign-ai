import { Artifact } from "@/components/create-artifact";
import { CodeEditor } from "@/components/code-editor";
import {
  CopyIcon,
  MessageIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
  CodeIcon,
} from "@/components/icons";
import { toast } from "sonner";
import { generateUUID } from "@/lib/utils";
import {
  Console,
  ConsoleOutput,
  ConsoleOutputContent,
} from "@/components/console";
import { useWebContainer } from "@/components/web-container-provider";
import { useEffect, useState, useRef } from "react";

// Execute JavaScript code using WebContainers
async function executeJavaScript(
  code: string,
  webcontainer: any
): Promise<{ outputContent: Array<ConsoleOutputContent>; error?: string }> {
  const outputContent: Array<ConsoleOutputContent> = [];
  let error: string | undefined = undefined;

  try {
    if (!webcontainer) {
      throw new Error("WebContainer is not available");
    }

    // Clean the code - remove BOM and normalize line endings
    const cleanedCode = code
      .replace(/^\uFEFF/, "") // Remove BOM if present
      .replace(/^\s+/, "") // Remove leading whitespace
      .trim(); // Trim any extra whitespace

    // Check if the code appears to be Python
    if (isPythonCode(cleanedCode)) {
      return {
        outputContent: [
          {
            type: "text",
            value:
              "⚠️ Python code detected. This environment runs JavaScript with Node.js, not Python. Please use JavaScript code instead.",
          },
          {
            type: "text",
            value:
              "Here's a simple JavaScript example to get you started:\n\nconsole.log('Hello, world!');\n\n// Define a function\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('Developer'));",
          },
        ],
        error: "Python code cannot be executed in JavaScript environment",
      };
    }

    // Create a better error handler code wrapper
    const errorHandlingCode = `
try {
${cleanedCode}
} catch (error) {
  console.error('Execution error: ' + error.message);
  if (error.stack) {
    console.error(error.stack.split('\\n').slice(0, 3).join('\\n'));
  }
}
`.trim();

    // Log the code being executed (helpful for debugging)
    console.log("Executing code:", errorHandlingCode);

    // Write the code to index.js
    await webcontainer.fs.writeFile("index.js", errorHandlingCode);

    // Start the process
    const startProcess = await webcontainer.spawn("node", ["index.js"]);

    // Collect stdout
    let stdoutString = "";
    let errorOutput = "";
    startProcess.output.pipeTo(
      new WritableStream({
        write(chunk) {
          const chunkStr = chunk.toString();
          stdoutString += chunkStr;

          // Check if this is error content
          if (chunkStr.includes("Execution error:")) {
            errorOutput += chunkStr;
          }

          // Add fancy formatting for errors to make them stand out
          if (chunkStr.includes("Error:") || chunkStr.includes("error:")) {
            outputContent.push({
              type: "text",
              value: `🚫 ${chunkStr}`,
            });
          } else {
            outputContent.push({
              type: "text",
              value: chunkStr,
            });
          }
        },
      })
    );

    // Wait for process to exit and check status
    const exitCode = await startProcess.exit;

    if (exitCode !== 0) {
      // Extract the actual error message from the output
      const errorMatch = errorOutput.match(/Execution error: (.*?)(\n|$)/);
      const errorMsg = errorMatch
        ? errorMatch[1]
        : `Process exited with code ${exitCode}`;

      error = errorMsg;

      // Only add this message if we don't already have error output
      if (!errorOutput) {
        outputContent.push({
          type: "text",
          value: `🚫 ${errorMsg}`,
        });
      }
    }
  } catch (err: any) {
    const errorMsg = err.message || "Error executing JavaScript";
    error = errorMsg;
    outputContent.push({
      type: "text",
      value: `🚫 Error: ${errorMsg}`,
    });
  }

  return { outputContent, error };
}

// Function to detect if the code is likely Python
function isPythonCode(code: string): boolean {
  // Look for common Python patterns
  const pythonIndicators = [
    /^#!/, // Shebang
    /^# .*Python/i, // Python comment
    /\bdef \w+\s*\(.*\):/, // Function definition
    /\bimport\s+(\w+(\s*,\s*\w+)*)/, // import statement
    /\bfrom\s+\w+(\.\w+)*\s+import\s+/, // from...import
    /\bif\s+__name__\s*==\s*('|")__main__\1\s*:/, // if __name__ == "__main__"
    /\bindent|except:|finally:/, // Python specific keywords
    /\bclass\s+\w+(\s*\(\s*\w+\s*\))?:/, // class definition
    /\bprint\s*\(/, // print function
    /^\s*>>>/, // Python REPL
  ];

  // Check for language indicator comments
  if (
    code.trim().startsWith("# Python") ||
    code.includes("# -*- coding: utf-8 -*-") ||
    code.match(/^# Simple .* in Python/)
  ) {
    return true;
  }

  // Check for Python indicators
  for (const pattern of pythonIndicators) {
    if (pattern.test(code)) {
      return true;
    }
  }

  // Check for statistical indicators (if there are lots of Python-specific syntax)
  let pythonSyntaxCount = 0;
  if (code.includes("def ")) pythonSyntaxCount++;
  if (code.includes("import ")) pythonSyntaxCount++;
  if (code.includes("print(")) pythonSyntaxCount++;
  if (code.includes(":")) pythonSyntaxCount++;
  if (code.includes("__")) pythonSyntaxCount++;

  // If we have multiple Python indicators in the same file, it's likely Python
  return pythonSyntaxCount >= 3;
}

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
module.exports = {
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
module.exports = {
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

            // Add significant logs to the console
            if (
              output.includes("Local:") ||
              output.includes("ready in") ||
              output.includes("started")
            ) {
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

interface Metadata {
  outputs: Array<ConsoleOutput>;
  reactUrl?: string;
  mode?: "code" | "react";
}

export const codeArtifact = new Artifact<"code", Metadata>({
  kind: "code",
  description:
    "Useful for code generation; Code execution is available for JavaScript using WebContainers. React components can be rendered.",
  initialize: async ({ setMetadata }) => {
    // Initialize with default metadata without running anything
    setMetadata((currentMetadata) => ({
      ...(currentMetadata || {}),
      outputs: [],
      mode: "react", // Default to React mode
    }));
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "code-delta") {
      const streamContent = (streamPart.content as string) || "";

      // Use a proper initialization if the content is empty or undefined
      const defaultContent =
        '// Write your JavaScript code here\nconsole.log("Hello, world!");';
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
    // Log incoming props to see what content is provided
    console.log("🧩 Code Artifact rendering with props:", {
      contentLength: props.content?.length || 0,
      contentPreview: props.content
        ? props.content.substring(0, 50) + "..."
        : "empty",
      status: props.status,
      isCurrentVersion: props.isCurrentVersion,
      hasMetadata: !!metadata,
    });

    // Default content for the editor
    const displayContent =
      props.content ||
      '// Enter your code here\n// Click "Run" to execute JavaScript\n// Click "Run as React" to render a React component';

    console.log("🧩 Code Artifact using displayContent:", {
      usingDefaultContent: !props.content,
      displayContentLength: displayContent.length,
      displayContentPreview: displayContent.substring(0, 50) + "...",
    });

    // State to track active runner and execution
    const [runningCode, setRunningCode] = useState<{
      content: string;
      runId: string;
      mode: "code" | "react";
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
        const { runId, content, mode = "code" } = event.detail;
        setRunningCode({ runId, content, mode });
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

    // Execute code when running state changes
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

          // Check if we should render as React or execute as JavaScript
          if (
            runningCode.mode === "react" ||
            isReactComponentCode(runningCode.content)
          ) {
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
          } else {
            // Execute using WebContainer
            const result = await executeJavaScript(
              runningCode.content,
              webcontainer
            );

            if (result.error) {
              setMetadata((metadata) => ({
                ...metadata,
                mode: "code",
                outputs: [
                  ...metadata.outputs.filter(
                    (output) => output.id !== runningCode.runId
                  ),
                  {
                    id: runningCode.runId,
                    contents: [
                      { type: "text", value: result.error || "Unknown error" },
                    ],
                    status: "failed",
                  },
                ],
              }));
            } else {
              setMetadata((metadata) => ({
                ...metadata,
                mode: "code",
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
          <div className="p-3 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md mb-3 text-sm">
            <div className="font-medium">WebContainers is initializing...</div>
            <div className="text-xs mt-1">
              Please wait while we prepare the JavaScript execution environment.
            </div>
          </div>
        );
      }

      if (containerError) {
        return (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md mb-3 text-sm">
            <div className="font-medium">
              WebContainers could not be initialized
            </div>
            <div className="text-xs mt-1">{containerError}</div>
            <div className="text-xs mt-2">
              <strong>Note:</strong> WebContainers requires a secure context and
              specific HTTP headers. The code will still be displayed but cannot
              be executed.
            </div>
          </div>
        );
      }

      if (webcontainer) {
        return (
          <div className="p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md mb-3 text-xs">
            <div>
              🟢 <strong>JavaScript Runtime Ready</strong> - You can now execute
              JavaScript/Node.js code
            </div>
            <div className="mt-1">
              💻 <strong>React Rendering Available</strong> - You can run React
              components with the "Run as React" button
            </div>
          </div>
        );
      }

      return null;
    };

    // Add debugging in development
    const debugInfo =
      process.env.NODE_ENV === "development" ? (
        <div className="text-xs text-gray-500 mb-2 p-1 bg-gray-100 dark:bg-gray-800">
          Content length: {props.content?.length || 0}
          {!props.content && " (using default)"}
          <br />
          WebContainer: {webcontainer ? "Available" : "Not available"}
          {isLoading && " (Loading...)"}
          {containerError && ` (Error: ${containerError})`}
          <br />
          Mode: {metadata?.mode || "code"}
          {metadata?.reactUrl && ` | React URL: ${metadata.reactUrl}`}
        </div>
      ) : null;

    // Add this effect to handle the iframe src properly
    useEffect(() => {
      // When the reactUrl changes and we have an iframe reference
      if (iframeRef.current && metadata?.reactUrl) {
        // Very detailed logging to help debug issues with iframe URL
        console.log(
          "🔗 Setting iframe src to WebContainer URL:",
          metadata.reactUrl
        );
        console.log("Iframe current src:", iframeRef.current.src || "none");

        try {
          // Important: Set the src directly as a property (not via attribute)
          // This ensures it's treated as an absolute URL
          iframeRef.current.src = metadata.reactUrl;

          // After a brief delay, check if the iframe loaded correctly
          setTimeout(() => {
            if (iframeRef.current) {
              console.log("Iframe src after setting:", iframeRef.current.src);

              // Add a message to the console about iframe status
              if (iframeRef.current.src === metadata.reactUrl) {
                console.log("✅ Iframe URL set successfully");
              } else {
                console.warn("⚠️ Iframe URL may not have been set correctly");
              }
            }
          }, 500);
        } catch (err) {
          console.error("Error setting iframe src:", err);
        }
      }
    }, [metadata?.reactUrl]);

    // Add this near your iframe to help debug connection issues
    {
      metadata?.reactUrl && (
        <div className="text-xs bg-gray-100 p-2 mt-2 rounded">
          <div className="font-bold">Debugging Connection:</div>
          <div>URL: {metadata.reactUrl}</div>
          <button
            onClick={() => {
              // Try to open the URL in a new tab to test direct access
              window.open(metadata.reactUrl, "_blank");
            }}
            className="px-2 py-1 bg-blue-500 text-white rounded mt-1 text-xs"
          >
            Test URL in new tab
          </button>
          <button
            onClick={() => {
              // Force refresh the iframe
              if (iframeRef.current) {
                iframeRef.current.src = metadata.reactUrl + "?" + Date.now();
              }
            }}
            className="px-2 py-1 bg-green-500 text-white rounded mt-1 text-xs ml-2"
          >
            Force refresh
          </button>
        </div>
      );
    }

    // Render the appropriate content based on the mode
    const renderContentByMode = () => {
      if (metadata?.mode === "react" && metadata?.reactUrl) {
        return (
          <div className="flex flex-col h-full">
            <div className="px-1 flex-1 min-h-[600px] border border-border rounded-md overflow-hidden">
              <iframe
                ref={iframeRef}
                title="React Component Preview"
                className="w-full h-full border-none"
                allow="clipboard-read; clipboard-write"
                // Force iframe to refresh when URL changes by using key
                key={`frame-${metadata.reactUrl}`}
                // Expand sandbox permissions to allow more functionality
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
              />
            </div>
            <div className="flex justify-between mt-2">
              <div className="text-xs text-gray-500">
                {metadata.reactUrl && (
                  <span>
                    Connected to WebContainer server at: {metadata.reactUrl}
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  setMetadata((prev) => ({ ...prev, mode: "code" }))
                }
                className="px-3 py-1.5 text-xs border rounded-md bg-secondary hover:bg-secondary/80"
              >
                Back to Editor
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="px-1 flex-1">
          <CodeEditor {...props} content={displayContent} />
        </div>
      );
    };

    return (
      <div className="w-full h-full flex flex-col">
        {debugInfo}

        {/* Show WebContainer status information */}
        <WebContainerStatus />

        {renderContentByMode()}

        {metadata?.outputs && (
          <Console
            consoleOutputs={metadata.outputs}
            setConsoleOutputs={() => {
              setMetadata({
                ...metadata,
                outputs: [],
              });
            }}
          />
        )}
      </div>
    );
  },
  actions: [
    {
      icon: <PlayIcon size={18} />,
      label: "Run",
      description: "Execute JavaScript code using WebContainers",
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
        }));

        // Dispatch custom event to trigger code execution
        if (typeof window !== "undefined") {
          const event = new CustomEvent("execute-code", {
            detail: { runId, content, mode: "code" },
          });
          window.dispatchEvent(event);
        }
      },
    },
    {
      icon: <CodeIcon size={18} />,
      label: "Run as React",
      description: "Render as a React component in WebContainers",
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
            detail: { runId, content, mode: "react" },
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

// For React components:
async function setupReactEnvironment(webcontainer: any, code: string) {
  // ... existing code ...

  // Start the dev server and ensure we get the correct URL
  const devServer = await webcontainer.spawn("npm", ["run", "dev"]);

  // Get a proper reference to the WebContainer's dev server URL
  const devServerUrl = await new Promise<string>((resolve) => {
    devServer.output.pipeTo(
      new WritableStream({
        write(chunk) {
          const text = chunk.toString();
          // Look for the Vite output that shows the URL
          if (text.includes("Local:") && text.includes("http://localhost")) {
            // Extract the URL from Vite's output
            const match = text.match(/Local:\s+(http:\/\/localhost:\d+)/);
            if (match && match[1]) {
              resolve(match[1]);
            }
          }
        },
      })
    );
  });

  // Return the actual URL to use in the iframe
  return {
    url: devServerUrl,
    process: devServer,
  };
}

// Then update the component that renders the preview iframe:
const PreviewComponent = ({ url }: { url: string }) => {
  // Use useEffect to properly handle the iframe URL
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && url) {
      // Set the src directly to ensure it's treated as absolute URL
      iframeRef.current.src = url;
    }
  }, [url]);

  return (
    <div className="preview-container">
      <iframe
        ref={iframeRef}
        title="React Component Preview"
        className="component-preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};
