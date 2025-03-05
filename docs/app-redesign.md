To redesign your app with a focus on interacting with React artifacts, prioritizing the rendered React components as the primary user experience and relegating the React code and chat to secondary roles, we’ll need a structured plan. The current chat-centric implementation will be adjusted so that once a React artifact is generated, the chat moves to the side, and the rendered component takes center stage. Additionally, we’ll remove all functionality unrelated to the chat, React artifacts, and their rendering—specifically, image, sheet, and text artifacts. Given the scope of this change, I’ve outlined a detailed, step-by-step plan to ensure a smooth implementation.

---

### Redesign Plan

#### Step 1: Remove Unnecessary Artifact Types

The goal here is to streamline the app by eliminating support for image, sheet, and text artifacts, keeping only React (code) artifacts.

- **Identify and Locate Code:**

  - **Frontend:**
    - In the `artifacts` directory, remove the `image`, `sheet`, and `text` subdirectories, retaining only `code`.
    - In the `components` directory, delete components like `image-editor.tsx`, `sheet-editor.tsx`, and `text-editor.tsx` that are tied to these artifact types.
  - **Backend:**
    - In `lib/ai/tools`, remove or adjust tools unrelated to React artifacts (e.g., `get-weather.ts` if not needed), but retain `create-document.ts` and `update-document.ts` if they support React artifacts.
    - In `app/(chat)/api/chat/route.ts`, update the `streamText` tools list to exclude anything not related to React artifacts.
  - **Database:**
    - In `lib/db/schema.ts`, modify the `document` table’s `kind` field to only allow `'code'` (for React artifacts), removing `'image'`, `'sheet'`, and `'text'`.

- **Remove or Comment Out Code:**

  - Delete the identified directories and files.
  - Update imports and references throughout the codebase (e.g., in `components/artifact.tsx` or any chat-related components) to reflect the removal.
  - Example: In `app/(chat)/api/document/route.ts`, ensure `ArtifactKind` only includes `'code'`.

- **Verify Integrity:**
  - Run the app after removal to check for errors.
  - Test chat and React artifact generation to ensure core functionality remains intact.

#### Step 2: Redesign the UX to Prioritize Rendered React Components

Shift the focus from the chat to the rendered React component once it’s generated.

- **Adjust Layout:**

  - Modify `app/(chat)/chat/[id]/page.tsx` (the specific chat page) to conditionally render the React artifact prominently when available.
  - Current setup: `<Chat />` and `<DataStreamHandler />`. Update `<Chat />` to manage a new layout.
  - Proposed layout: Use a split view where the rendered component occupies the main area (e.g., 70% width), and the chat moves to a sidebar (e.g., 30% width).

- **Implementation:**

  - **State Management:**
    - Add a state in `components/chat.tsx` to track if a React artifact exists (e.g., based on messages or database query).
  - **CSS Layout:**
    - Use Flexbox or CSS Grid in `chat.tsx`:
      ```tsx
      <div className="flex h-full">
        <div className={artifact ? "w-3/4" : "w-full"}>
          {artifact ? <CodePreview content={artifact.content} /> : null}
        </div>
        <div className={artifact ? "w-1/4" : "w-0 hidden"}>
          {/* Chat content */}
        </div>
      </div>
      ```
    - Alternatively, use `react-resizable-panels` for a dynamic, user-adjustable split.
  - **Chat Repositioning:**
    - When an artifact is present, minimize or slide the chat to the side using CSS transitions.
    - Add a toggle button to show/hide the chat (e.g., in `chat-header.tsx`).

- **Accessibility:**
  - Ensure the chat remains accessible via a button or keyboard shortcut (e.g., `Ctrl + C` to toggle chat visibility).
  - Test with screen readers to confirm usability.

#### Step 3: Ensure Seamless Interaction Between Chat and Rendered Components

Maintain a smooth workflow between the rendered component and chat.

- **Interactive Components:**

  - In `artifacts/code/components/CodePreview.tsx`, ensure the rendered React component is fully interactive (e.g., buttons work, forms submit).
  - Verify state management and event handling are intact.

- **Feedback via Chat:**

  - Allow users to send feedback or modification requests via the chat while viewing the artifact.
  - Example: In `chat.tsx`, keep the input active and append context about the current artifact to new messages.

- **Dynamic Updates:**
  - If the rendered component includes a “Regenerate” button, trigger a new artifact generation via the chat API (`app/(chat)/api/chat/route.ts`).

#### Step 4: Update Backend and API Changes

Align the backend to support only React artifacts.

- **API Adjustments:**

  - In `app/(chat)/api/chat/route.ts`, remove tools like `getWeather` and ensure `createDocument` and `updateDocument` only handle `'code'` artifacts.
  - Update logic to reject non-React artifact requests.

- **Database Schema:**

  - In `lib/db/schema.ts`, restrict `document.kind` to `'code'`:
    ```ts
    kind: varchar('kind', { enum: ['code'] }).notNull().default('code'),
    ```
  - Update queries in `lib/db/queries.ts` (e.g., `saveDocument`, `getDocumentsById`) to enforce this.

- **Tool Cleanup:**
  - Remove unused tools from `lib/ai/tools` if they don’t support React artifacts.

#### Step 5: Test the New UX Thoroughly

Validate the redesign across devices and use cases.

- **Device Testing:**

  - Test on desktop, tablet, and mobile to ensure responsiveness.
  - Adjust CSS for smaller screens (e.g., stack chat below the artifact on mobile).

- **Flow Testing:**

  - Start a chat, generate a React artifact, and verify it displays prominently with the chat sidelined.
  - Interact with the artifact and send feedback via chat to confirm integration.

- **Regression Testing:**
  - Ensure React artifact generation and rendering work as before.
  - Check that removing other artifact types didn’t introduce errors.

---

### Implementation Steps

Here’s how to execute the plan:

1. **Remove Artifact Directories:**

   - Delete `artifacts/image`, `artifacts/sheet`, and `artifacts/text`.
   - Update imports in `components/artifact.tsx`.

2. **Remove Related Components:**

   - Delete `image-editor.tsx`, `sheet-editor.tsx`, and `text-editor.tsx` from `components`.
   - Adjust parent components (e.g., `create-artifact.tsx`).

3. **Update API Routes:**

   - In `app/(chat)/api/chat/route.ts`, limit tools to React-relevant ones:
     ```ts
     experimental_activeTools: ['createDocument', 'updateDocument'],
     tools: { createDocument, updateDocument },
     ```

4. **Adjust Database Schema:**

   - Update `lib/db/schema.ts` as shown above.
   - Run `npm run db:migrate` to apply changes.

5. **Modify Chat Page Layout:**

   - In `app/(chat)/chat/[id]/page.tsx`, pass artifact state to `<Chat />`.
   - Update `chat.tsx` with the split layout.

6. **Implement New UX:**

   - Add CSS or a library like `react-resizable-panels` for the layout.
   - Include a chat toggle button.

7. **Ensure Interactivity:**

   - Test `CodePreview.tsx` for full interactivity.
   - Link chat feedback to artifact updates.

8. **Test Thoroughly:**
   - Run manual tests across devices.
   - Verify no errors from removed features.

---

### Next Steps

After implementing this plan, the app will focus solely on React artifacts, with the rendered component as the primary experience and the chat as a secondary tool. Once the UX is stable, we can shift focus to enhancing the UI and design language (e.g., refining styles, animations, or accessibility). Start with Step 1, test after each step, and adjust as needed based on feedback or issues encountered. This phased approach minimizes risk and ensures a robust redesign.
