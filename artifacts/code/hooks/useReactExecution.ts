import { reactTemplateFiles } from "../utils/templateFiles";
import { isGoStackTrace, extractErrorMessage } from "../utils/errorHandling";

// Define types for console output
interface ConsoleOutputContent {
  type: string;
  value: string;
}

// Execute a React component in WebContainer
export async function executeReactComponent(
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

// Create a hook to manage React execution
export function useReactExecution() {
  return {
    executeReactComponent,
  };
}
