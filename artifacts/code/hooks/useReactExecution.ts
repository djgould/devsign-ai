import { reactTemplateFiles } from "../utils/templateFiles";
import { TemplateFiles } from "../utils/templateTypes";
import { isGoStackTrace, extractErrorMessage } from "../utils/errorHandling";

// Define types for console output
interface ConsoleOutputContent {
  type: string;
  value: string;
}

// Execute a React component in WebContainer
export async function executeReactComponent(
  code: string,
  webcontainer: any,
  onProgress?: (status: string) => void
): Promise<{
  url: string;
  outputContent: Array<ConsoleOutputContent>;
  error?: string;
}> {
  const outputContent: Array<ConsoleOutputContent> = [];

  // Helper function to update both output content and progress status
  const updateProgress = (message: string) => {
    outputContent.push({
      type: "text",
      value: message,
    });

    if (onProgress) {
      onProgress(message);
    }
  };

  try {
    if (!webcontainer) {
      throw new Error("WebContainer is not available");
    }

    updateProgress("🔄 Setting up React environment...");

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
      updateProgress("📁 Creating project structure...");

      // Collect top-level files for mounting (those without slashes in their paths)
      const rootFiles: Record<string, any> = {};
      const pathsByDirectory: Record<string, string[]> = {};

      // Organize all files by their directories
      Object.keys(reactTemplateFiles as TemplateFiles).forEach((path) => {
        if (!path.includes("/")) {
          // Root level files
          rootFiles[path] = (reactTemplateFiles as Record<string, any>)[path];
        } else {
          // Organize by directory for sequential creation
          const directory = path.substring(0, path.lastIndexOf("/"));
          if (!pathsByDirectory[directory]) {
            pathsByDirectory[directory] = [];
          }
          pathsByDirectory[directory].push(path);
        }
      });

      // Mount all root level files at once
      await webcontainer.mount(rootFiles);
      updateProgress("📦 Root files mounted");

      // Create directories and write files for each directory path
      for (const directory of Object.keys(pathsByDirectory)) {
        // Create the directory structure
        await webcontainer.fs.mkdir(directory, { recursive: true });
        updateProgress(`📁 Created directory: ${directory}`);

        // Write all files in this directory
        const filePaths = pathsByDirectory[directory];
        for (const filePath of filePaths) {
          await webcontainer.fs.writeFile(
            filePath,
            (reactTemplateFiles as TemplateFiles)[filePath].file.contents
          );
        }
        updateProgress(`📄 Created files in ${directory}`);
      }

      updateProgress("📦 All template files created successfully");
    } catch (error: any) {
      console.error("Error setting up file structure:", error);
      updateProgress(`🚫 Error setting up file structure: ${error.message}`);
      throw error;
    }

    // Create components directory if not already created
    try {
      await webcontainer.fs.mkdir("src/components", { recursive: true });
    } catch (error) {
      console.error("Error creating components directory:", error);
      // Directory might already exist, ignore
    }

    // Write the component to a file
    try {
      updateProgress(`✏️ Writing your ${componentName} component...`);
      await webcontainer.fs.writeFile(
        `src/components/${componentName}.tsx`,
        code
      );
      updateProgress(`✅ Created component: ${componentName}`);
    } catch (error: any) {
      console.error("Error writing component file:", error);
      updateProgress(`🚫 Error writing component: ${error.message}`);
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
      updateProgress("📝 Configuring React application...");
      await webcontainer.fs.writeFile("src/App.jsx", appCode);
      updateProgress("📝 Updated App.jsx to use your component");
    } catch (error: any) {
      console.error("Error updating App.jsx:", error);
      updateProgress(`🚫 Error updating App.jsx: ${error.message}`);
      throw error;
    }

    // Install dependencies
    updateProgress("📦 Installing dependencies (this may take a moment)...");

    try {
      const installProcess = await webcontainer.spawn("npm", [
        "install",
        "--force",
      ]);

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

            // Report npm progress updates
            if (output.includes("added") && onProgress) {
              onProgress("Installing React dependencies...");
            } else if (output.includes("Done") && onProgress) {
              onProgress("Dependencies installed successfully");
            } else if (
              (output.includes("error") || output.includes("npm ERR!")) &&
              onProgress
            ) {
              onProgress(`Error during installation: ${output.split("\n")[0]}`);
            }
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

      updateProgress("✅ Dependencies installed successfully");
    } catch (error: any) {
      console.error("Error installing dependencies:", error);
      updateProgress(`🚫 Error installing dependencies: ${error.message}`);
      throw error;
    }

    // Start the Vite dev server
    updateProgress("🚀 Starting React development server...");

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

        if (onProgress) {
          onProgress("Server taking longer than expected... still trying");
        }
        // Don't reject yet - we'll try fallback mechanisms
      }, 15000);

      // Start the dev server
      updateProgress("🛠️ Building and transpiling your component...");
      const devProcess = await webcontainer.spawn("npm", ["run", "dev"]);
      console.log("🚀 Dev server started");

      if (onProgress) {
        onProgress("Starting Vite development server...");
      }

      // Get server output for debugging and fallback URL detection
      const outputChunks: string[] = [];

      // Process the output to collect it and look for URLs as a fallback
      devProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            const output = chunk.toString();
            outputChunks.push(output);
            console.log("[Dev]", output);

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

                if (onProgress) {
                  onProgress(`Build error: ${errorMessage}`);
                }
              } else {
                outputContent.push({
                  type: "text",
                  value:
                    "A build error occurred. Please check your code for syntax errors.",
                });

                if (onProgress) {
                  onProgress("Build error: Check your code for syntax errors");
                }
              }
            } else {
              // For normal output, display it directly
              outputContent.push({
                type: "text",
                value: output,
              });

              // Report important build events
              if (output.includes("transforming") && onProgress) {
                onProgress("Transforming JSX code...");
              } else if (output.includes("build completed") && onProgress) {
                onProgress("Build completed, starting server...");
              } else if (output.includes("ready in") && onProgress) {
                onProgress("Development server ready!");
              }
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

          updateProgress(`🌐 Server ready at: ${url}`);

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
                updateProgress(`🌐 Server ready at: ${url}`);
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
            updateProgress(`🌐 Server ready at: ${url} (extracted from logs)`);
            resolveUrlPromise(url);
          } else {
            // Fallback 3: Default to standard localhost:3000
            console.warn("⚠️ Using default URL fallback");
            const defaultUrl = "http://localhost:3000";

            updateProgress(
              `⚠️ Could not detect server URL, trying default: ${defaultUrl}`
            );
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

        updateProgress("✨ Component ready for preview!");

        return { url: serverUrl, outputContent };
      } catch (error: any) {
        console.error("❌ Error waiting for server URL:", error);
        clearTimeout(hardTimeoutId);

        updateProgress(`🚫 Error waiting for server URL: ${error.message}`);
        throw error;
      }
    } catch (error: any) {
      console.error("Error starting dev server:", error);
      updateProgress(`🚫 Error starting dev server: ${error.message}`);
      throw error;
    }
  } catch (error: any) {
    const errorMsg = error.message || "Error executing React component";
    console.error("React execution error:", error);
    updateProgress(`🚫 Error: ${errorMsg}`);
    return { url: "", outputContent, error: errorMsg };
  }
}

// Function to update a React component in an existing WebContainer
export async function updateReactComponent(
  code: string,
  webcontainer: any,
  onProgress?: (status: string) => void,
  existingUrl?: string
): Promise<{
  url: string;
  outputContent: Array<ConsoleOutputContent>;
  error?: string;
}> {
  const outputContent: Array<ConsoleOutputContent> = [];

  // Helper function to update both output content and progress status
  const updateProgress = (message: string) => {
    outputContent.push({
      type: "text",
      value: message,
    });

    if (onProgress) {
      onProgress(message);
    }
  };

  try {
    if (!webcontainer) {
      throw new Error("WebContainer is not available");
    }

    updateProgress("🔄 Updating existing React component...");

    // Extract component name from the code
    let componentName = "MyComponent";
    const componentNameMatch = code.match(
      /function\s+(\w+)|class\s+(\w+)|const\s+(\w+)\s*=/
    );
    if (componentNameMatch) {
      componentName =
        componentNameMatch[1] || componentNameMatch[2] || componentNameMatch[3];
    }

    // Create components directory if not already created
    try {
      await webcontainer.fs.mkdir("src/components", { recursive: true });
    } catch (error) {
      console.error("Error creating components directory:", error);
      // Directory might already exist, ignore
    }

    // Write the component to a file
    try {
      updateProgress(`✏️ Writing your ${componentName} component...`);
      await webcontainer.fs.writeFile(
        `src/components/${componentName}.tsx`,
        code
      );
      updateProgress(`✅ Updated component: ${componentName}`);
    } catch (error: any) {
      console.error("Error writing component file:", error);
      updateProgress(`🚫 Error writing component: ${error.message}`);
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
      updateProgress("📝 Updating application configuration...");
      await webcontainer.fs.writeFile("src/App.jsx", appCode);
      updateProgress("📝 Updated App.jsx to use your component");
    } catch (error: any) {
      console.error("Error updating App.jsx:", error);
      updateProgress(`🚫 Error updating App.jsx: ${error.message}`);
      throw error;
    }

    // Use the existing URL as we're just updating files in an already running server
    // No need to determine the URL again since the server is already running
    const serverUrl = existingUrl || "http://localhost:3000";

    updateProgress("✨ Component updated and ready for preview!");
    return { url: serverUrl, outputContent };
  } catch (error: any) {
    const errorMsg = error.message || "Error updating React component";
    console.error("React update error:", error);
    updateProgress(`🚫 Error: ${errorMsg}`);
    return { url: "", outputContent, error: errorMsg };
  }
}

// Create a hook to manage React execution
export function useReactExecution() {
  return {
    executeReactComponent,
    updateReactComponent,
  };
}
