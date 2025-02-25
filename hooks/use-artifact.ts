"use client";

import useSWR from "swr";
import { UIArtifact } from "@/components/artifact";
import { useCallback, useMemo } from "react";

export const initialArtifactData: UIArtifact = {
  documentId: "init",
  content: `// JavaScript Code Execution with WebContainers
// This code runs in a secure Node.js environment

// Simple examples
console.log('Hello, World!');

// Working with variables and strings
const name = 'Developer';
console.log(\`Welcome, \${name}!\`);

// Functions
function calculateArea(radius) {
  return Math.PI * radius * radius;
}

console.log('Area of circle with radius 5:', calculateArea(5).toFixed(2));

// Arrays and higher-order functions
const numbers = [1, 2, 3, 4, 5];
const squared = numbers.map(num => num * num);
console.log('Original numbers:', numbers);
console.log('Squared numbers:', squared);

// Async/await example
async function fetchSimulatedData() {
  console.log('Fetching data...');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    user: 'John Doe',
    id: 123,
    role: 'Admin'
  };
}

// Call the async function
fetchSimulatedData().then(data => {
  console.log('Data received:', data);
});

/* 
 * NOTES
 * -----
 * - Use this environment for JavaScript and Node.js code
 * - Python code is not supported in this environment
 * - For file system access or installing packages, see WebContainers documentation
 */
`,
  kind: "code",
  title: "JavaScript Code",
  status: "idle",
  isVisible: true,
  boundingBox: {
    top: 0,
    left: 0,
    width: 800,
    height: 600,
  },
};

type Selector<T> = (state: UIArtifact) => T;

export function useArtifactSelector<Selected>(selector: Selector<Selected>) {
  const { data: localArtifact } = useSWR<UIArtifact>("artifact", null, {
    fallbackData: initialArtifactData,
  });

  const selectedValue = useMemo(() => {
    if (!localArtifact) return selector(initialArtifactData);
    return selector(localArtifact);
  }, [localArtifact, selector]);

  return selectedValue;
}

export function useArtifact() {
  const { data: localArtifact, mutate: setLocalArtifact } = useSWR<UIArtifact>(
    "artifact",
    null,
    {
      fallbackData: initialArtifactData,
    }
  );

  const artifact = useMemo(() => {
    if (!localArtifact) return initialArtifactData;
    return localArtifact;
  }, [localArtifact]);

  const setArtifact = useCallback(
    (updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)) => {
      setLocalArtifact((currentArtifact) => {
        const artifactToUpdate = currentArtifact || initialArtifactData;

        if (typeof updaterFn === "function") {
          return updaterFn(artifactToUpdate);
        }

        return updaterFn;
      });
    },
    [setLocalArtifact]
  );

  const { data: localArtifactMetadata, mutate: setLocalArtifactMetadata } =
    useSWR<any>(
      () =>
        artifact.documentId ? `artifact-metadata-${artifact.documentId}` : null,
      null,
      {
        fallbackData: null,
      }
    );

  return useMemo(
    () => ({
      artifact,
      setArtifact,
      metadata: localArtifactMetadata,
      setMetadata: setLocalArtifactMetadata,
    }),
    [artifact, setArtifact, localArtifactMetadata, setLocalArtifactMetadata]
  );
}
