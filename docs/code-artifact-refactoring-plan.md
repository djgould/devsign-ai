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
    ├── context/
    │   └── WebContainerContext.tsx (WebContainer provider)
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

4. **Create WebContainer Context Provider**:
   - Create a new `WebContainerContext.tsx` file in a new `context/` directory
   - Move WebContainer initialization and management logic from `useWebContainer.ts` hook into the context provider
   - Expose the WebContainer instance, status, and relevant methods through the context
   - Wrap the main application with the WebContainer provider
   - Update components to consume the WebContainer context instead of using the hook directly
   - Implement proper cleanup and connection management in the provider
   - Add better error handling and recovery mechanisms
   - Allow multiple components to interact with the same WebContainer instance

### 5. State Management Improvements (Detailed Implementation Plan)

1. **Create WebContainer Context Provider**:

   - Create directory: `artifacts/code/context/`
   - Create file: `WebContainerContext.tsx` with the following features:
     - Define a context interface with `WebContainer`, `isLoading`, and `error` states
     - Implement a provider component that initializes the WebContainer
     - Move initialization logic from `useWebContainer.ts` hook
     - Add methods for common WebContainer operations (file manipulation, process management)
     - Implement better error handling with recovery strategies
     - Add proper cleanup when the context is unmounted
     - Export a custom `useWebContainer` hook for consuming the context

2. **Refactor Client Component**:

   - Update `client.tsx` to use the WebContainer context provider
   - Wrap the main content with `<WebContainerProvider>`
   - Replace direct WebContainer hook usage with context consumption
   - Ensure all child components receive WebContainer state through context

3. **Update Tab Navigation**:

   - Enhance `TabNavigation.tsx` to maintain consistent state when switching tabs
   - Implement state persistence between tab switches (don't reset state on tab change)
   - Add transition animations for smoother tab switching experience
   - Fix tab activation indicators to properly reflect current state
   - Ensure accessibility attributes are correctly maintained

4. **Improve Iframe Management**:

   - Update `CodePreview.tsx` to better handle iframe lifecycle
   - Keep iframe mounted but hidden when not active to preserve state
   - Implement proper event handling for iframe loading/errors
   - Add data attributes to track iframe state
   - Implement a more reliable URL tracking mechanism
   - Add a status overlay for iframe loading states
   - Ensure proper cleanup of event listeners

5. **Centralize Editor State**:

   - Enhance `useEditorState.ts` to serve as the primary state manager
   - Implement a reducer pattern for complex state transitions
   - Add proper type definitions for all state transitions
   - Create action creators for common state changes
   - Ensure state updates are atomic and predictable
   - Add state history for undo/redo functionality
   - Implement state persistence in local storage for recovery

6. **Implement Global Error Handling**:
   - Add centralized error tracking and reporting
   - Create an error boundary component to catch UI rendering errors
   - Implement graceful degradation for non-critical features
   - Add user-friendly error messages with recovery instructions
   - Log errors to console with debugging information

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

### Phase 2: Extract Utilities ✓

- ✓ Create the new folder structure
- ✓ Move utility functions to their own files
- ✓ Update imports without changing behavior

### Phase 3: Create Hooks ✓

- ✓ Extract hooks one by one
- ✓ Test each hook independently

### Phase 4: Component Extraction ✓

- ✓ Create components in isolation
- ✓ Ensure they work with the current state management

### Phase 5: WebContainer Context Implementation

- Implement WebContainer context provider
- Update hook interfaces
- Test context functionality

### Phase 6: Client Component Refactoring

- Refactor main client component
- Integrate with context provider
- Test integration

### Phase 7: Tab Navigation Improvement

- Update tab navigation system
- Fix state persistence issues
- Test tab switching

### Phase 8: Iframe Management Enhancement

- Improve iframe handling
- Fix state preservation issues
- Test iframe behavior

### Phase 9: State Management Centralization

- Implement centralized state management
- Add reducer pattern
- Test state transitions

### Phase 10: Error Handling Implementation

- Add error boundaries
- Implement recovery mechanisms
- Test error scenarios

### Phase 11: Performance Optimization

- Optimize rendering
- Implement caching
- Measure and verify improvements

### Phase 12: Integration and Testing

- Connect all components together
- Ensure everything works seamlessly
- Fix edge cases and bugs

### Phase 13: Cleanup and Documentation

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
