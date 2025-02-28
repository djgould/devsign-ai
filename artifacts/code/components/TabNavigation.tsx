import React from "react";
import { EditorMode } from "../hooks/useEditorState";

interface TabNavigationProps {
  currentMode: EditorMode;
  onSwitchToEditorMode: () => void;
  onSwitchToPreviewMode: () => void;
  reactUrl?: string;
}

/**
 * Tab navigation component for switching between code editor and preview modes
 *
 * @param {TabNavigationProps} props - Configuration and callbacks
 * @returns {React.ReactNode} Tab navigation UI
 */
const TabNavigation: React.FC<TabNavigationProps> = ({
  currentMode,
  onSwitchToEditorMode,
  onSwitchToPreviewMode,
  reactUrl,
}) => {
  const isEditorMode = currentMode === "editor";
  const isPreviewMode = currentMode === "preview";
  const isPreviewDisabled = !reactUrl;

  return (
    <div className="mb-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-t-lg shadow-sm">
      <div className="max-w-screen-xl mx-auto px-2">
        <ul className="flex flex-wrap text-sm font-medium">
          <li className="mr-1">
            <button
              className={`inline-flex items-center px-4 py-3 rounded-t-lg transition-all duration-200 ${
                isPreviewDisabled
                  ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : isPreviewMode
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
              onClick={onSwitchToPreviewMode}
              disabled={isPreviewDisabled}
              aria-selected={isPreviewMode}
            >
              <svg
                className={`w-5 h-5 mr-2 ${
                  isPreviewDisabled
                    ? "text-gray-400 dark:text-gray-600"
                    : isPreviewMode
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                ></path>
              </svg>
              <span className="flex items-center text-base">
                Preview
                {isPreviewDisabled && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    Run code first
                  </span>
                )}
              </span>
            </button>
          </li>
          <li className="mr-1">
            <button
              className={`inline-flex items-center px-4 py-3 rounded-t-lg transition-all duration-200 ${
                isEditorMode
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800"
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
              onClick={onSwitchToEditorMode}
              aria-selected={isEditorMode}
            >
              <svg
                className={`w-4.5 h-4.5 mr-2 ${
                  isEditorMode
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                ></path>
              </svg>
              <span>Code Editor</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TabNavigation;
