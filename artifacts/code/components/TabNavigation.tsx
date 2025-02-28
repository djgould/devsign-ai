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
    <div className="mb-4 border-b border-gray-200">
      <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
        <li className="mr-2">
          <button
            className={`inline-flex items-center p-4 border-b-2 rounded-t-lg ${
              isEditorMode
                ? "text-blue-600 border-blue-600 active"
                : "border-transparent hover:text-gray-600 hover:border-gray-300"
            }`}
            onClick={onSwitchToEditorMode}
            aria-selected={isEditorMode}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
            Editor
          </button>
        </li>
        <li className="mr-2">
          <button
            className={`inline-flex items-center p-4 border-b-2 rounded-t-lg ${
              isPreviewDisabled
                ? "text-gray-400 cursor-not-allowed"
                : isPreviewMode
                ? "text-blue-600 border-blue-600 active"
                : "border-transparent hover:text-gray-600 hover:border-gray-300"
            }`}
            onClick={onSwitchToPreviewMode}
            disabled={isPreviewDisabled}
            aria-selected={isPreviewMode}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              ></path>
            </svg>
            Preview
            {isPreviewDisabled && (
              <span className="ml-2 text-xs">(Run code first)</span>
            )}
          </button>
        </li>
      </ul>
    </div>
  );
};

export default TabNavigation;
