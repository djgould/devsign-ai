import React from "react";

interface WebContainerStatusProps {
  isLoading: boolean;
  error: string | null;
}

/**
 * Displays the current status of the WebContainer
 *
 * @param {WebContainerStatusProps} props - Container status information
 * @returns {React.ReactNode} Status indicator component
 */
const WebContainerStatus: React.FC<WebContainerStatusProps> = ({
  isLoading,
  error,
}) => {
  if (error) {
    return (
      <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200">
        <h3 className="font-semibold mb-1">Runtime Environment Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg border border-blue-200">
        <div className="flex items-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700"
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
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Initializing runtime environment...</span>
        </div>
      </div>
    );
  }

  return null;
};

export default WebContainerStatus;
