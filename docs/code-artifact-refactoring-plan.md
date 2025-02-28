# Code Artifact Refactoring Plan

## Current Issues

The current implementation of `artifacts/code/client.tsx` has several issues that make it difficult to maintain and extend:

1. **File Size and Complexity**: The file is still large (~800 lines) even after removing JavaScript execution
2. **Mixed Concerns**: UI rendering, state management, WebContainer setup, and React rendering are all intertwined
3. **Complex Effect Handling**: Multiple useEffect hooks with complex dependencies and side effects
4. **Duplicated Logic**: Similar code patterns appear in multiple places
5. **Tightly Coupled Components**: Hard to modify one part without affecting others
6. **Tab Navigation Issues**: Inconsistent behavior when switching between editor and preview tabs
7. **Iframe Management**: Complex iframe state management leading to unreliable behavior

## ✅ Completed Steps

### Step 1: Remove JavaScript Execution Functionality ✓

- ✓ Removed `executeJavaScript` function and related code
- ✓ Simplified UI to focus on React execution
- ✓ Removed console output display
- ✓ Changed "Run as React" button to a simpler "Preview" button
- ✓ Removed Python code detection

## Refactoring Goals

1. **Improve Maintainability**: Make the code easier to understand and modify
2. **Enhance Reliability**: Fix issues with tab navigation and iframe state
3. **Optimize Performance**: Reduce unnecessary re-renders and improve loading time
4. **Simplify State Management**: Make state changes more predictable
5. **Support Future Extensions**: Create a structure that makes it easier to add new features
6. **Focus on React Execution**: Already completed - removed JavaScript execution functionality
7. **Streamline UI**: Already partly completed - simplified UI to focus on code editing and React preview

## Proposed Structure

We'll reorganize the codebase into the following structure:

```
artifacts/
└── code/
    ├── client.tsx (main entry point, much smaller)
    ├── components/
    │   ├── CodeEditor.tsx (editor component wrapper)
    │   ├── CodePreview.tsx (React preview component)
    │   ├── TabNavigation.tsx (tab UI and logic)
    │   └── WebContainerStatus.tsx (status indicators)
    ├── hooks/
    │   ├── useReactExecution.ts (React execution logic)
    │   ├── useWebContainer.ts (WebContainer setup & management)
    │   └── useEditorState.ts (state management for editor)
    └── utils/
        ├── errorHandling.ts (error parsing and formatting)
        ├── codeDetection.ts (limited to React component detection)
        └── templateFiles.ts (React template definitions)
```

## Detailed Refactoring Steps

### 2. Extract Utility Functions

1. Remove `isReactComponentCode` function as it's no longer needed after JavaScript execution functionality was removed.

2. Move React template files to `utils/templateFiles.ts`:

   - Extract `reactTemplateFiles` object which is actively used for setting up the React environment in the WebContainer

3. Create `utils/errorHandling.ts` for error parsing utilities:
   - Move `isGoStackTrace` and `extractErrorMessage` functions which are currently used for parsing and formatting error messages from esbuild and React execution

Note: The directory structure (`utils/`, `components/`, `hooks/`) already exists but is currently empty, so we'll be populating these directories with the appropriate files.

### 3. Create Custom Hooks

1. Create `hooks/useWebContainer.ts`:

   - Move WebContainer initialization and management logic
   - Simplify and improve error handling

2. Create `hooks/useReactExecution.ts`:

   - Move `executeReactComponent` function
   - Manage React preview rendering state

3. Create `hooks/useEditorState.ts`:

   - Centralize tab state management
   - Handle mode switching logic
   - Track React URL state consistently

### 4. Create UI Components

1. Create `components/CodePreview.tsx`:

   - Extract iframe logic and preview rendering
   - Simplify props and state management

2. Create `components/TabNavigation.tsx`:

   - Extract tab UI and switching logic
   - Ensure consistent tab behavior

3. Create `components/WebContainerStatus.tsx`:
   - Extract status indicator UI
   - Enhance status messages

### 5. State Management Improvements

1. **Fix Mode Handling**:

   - Use a more robust approach for tracking tab state
   - Prevent automatic mode switching overriding user selection

2. **Centralize State**:

   - Move related state variables together
   - Use a reducer pattern for complex state transitions

3. **Safe Iframe Management**:
   - Improve how iframe references are handled
   - Ensure proper cleanup and initialization

### 6. Performance Optimizations

1. **Reduce Re-renders**:

   - Use `React.memo` for pure components
   - Optimize dependency arrays in hooks

2. **Lazy Loading**:

   - Defer initialization of heavy components

3. **Caching**:
   - Cache expensive computations
   - Reuse template files across executions

## Implementation Plan

### Phase 1: Preparation ✓

- ✓ Removed JavaScript execution code
- ✓ Simplified the UI to focus on React components
- ✓ Updated action buttons to only include React preview

### Phase 2: Extract Utilities

- Create the new folder structure
- Move utility functions to their own files
- Update imports without changing behavior

### Phase 3: Create Hooks

- Extract hooks one by one
- Test each hook independently

### Phase 4: Component Extraction

- Create components in isolation
- Ensure they work with the current state management

### Phase 5: State Management Refactoring

- Implement improved state management
- Fix tab navigation and iframe issues

### Phase 6: Integration and Testing

- Connect all components together
- Ensure everything works seamlessly
- Fix edge cases and bugs

### Phase 7: Cleanup and Documentation

- Remove unused code
- Add comprehensive comments
- Document component APIs

## Specific Improvements for Tab Navigation Issue

The current tab navigation issue can be fixed by:

1. **Consistent State Tracking**:

   - Use a dedicated state variable for tracking tab selection
   - Decouple tab UI state from content visibility

2. **Prevent Automatic Mode Switching**:

   - Only switch mode automatically on initial URL load
   - Respect user tab selection for subsequent changes

3. **Better Visibility Management**:

   - Use a more reliable approach than visibility/hidden
   - Implement proper mounting/unmounting strategy

4. **Iframe State Preservation**:
   - Keep iframe mounted between tab switches
   - Preserve WebContainer connection consistently

## Benefits of Refactoring

1. **Better Developer Experience**:

   - Easier to understand each component's purpose
   - Simpler to modify isolated components

2. **Improved User Experience**:

   - More reliable tab navigation
   - Consistent editor and preview behavior
   - Simpler, more focused UI

3. **Future-Proofing**:

   - Easier to add new features
   - Simpler to integrate with other components

4. **Performance Gains**:

   - Faster initial loading with simpler codebase
   - Reduced unnecessary re-renders
   - Smaller bundle size with focused functionality

5. **Enhanced Testing**:

   - Isolated components are easier to test
   - Hooks can be tested independently

6. **Focused Functionality**:
   - Clear purpose: React component rendering
   - No distractions from unnecessary functionality
