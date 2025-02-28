// Helper function to detect Go stack traces
export function isGoStackTrace(output: string): boolean {
  return (
    output.includes("goroutine") &&
    (output.includes("github.com/evanw/esbuild") ||
      output.includes("runtime.gopark") ||
      output.includes("runtime/proc.go"))
  );
}

// Function to extract a meaningful error message from a stack trace
export function extractErrorMessage(stackTrace: string): string | null {
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
