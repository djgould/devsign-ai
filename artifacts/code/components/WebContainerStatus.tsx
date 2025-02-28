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
      <div className="mb-4 rounded-lg overflow-hidden shadow-sm border border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/80 dark:to-red-900/80">
        <div className="px-4 py-2 bg-red-500/10 dark:bg-red-800/20 border-b border-red-200 dark:border-red-800 flex items-center">
          <svg
            className="h-5 w-5 text-red-600 dark:text-red-400 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="font-semibold text-sm text-red-800 dark:text-red-200">
            Runtime Environment Error
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mb-4 rounded-lg overflow-hidden shadow-md border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/80 dark:to-blue-900/80">
        <div className="p-4">
          <div className="flex items-center">
            <div className="relative mr-3">
              <div className="absolute inset-0 rounded-full bg-blue-400/30 dark:bg-blue-500/30 animate-ping"></div>
              <svg
                className="relative animate-spin h-5 w-5 text-blue-600 dark:text-blue-400"
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
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Initializing Runtime Environment
              </h3>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
                Setting up the WebContainer to run your React components...
              </p>
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-blue-200 dark:bg-blue-800">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse-width"></div>
        </div>
      </div>
    );
  }

  return null;
};

export default WebContainerStatus;

/* Add this to your CSS file for the animate-pulse-width animation:
@keyframes pulse-width {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}
.animate-pulse-width {
  animation: pulse-width 2.5s infinite ease-in-out;
}
*/
