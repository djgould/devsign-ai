# Prompt Refinement Flow

This document outlines the implementation of hidden prompting steps to refine the output of code editing. The process includes improving user prompts, adding features for incomplete specifications, and fixing formatting issues.

## Updated Flow Diagram

```mermaid
sequenceDiagram
    participant Client as Client Browser
    participant ReactApp as React Application
    participant ArtifactComp as Artifact Component
    participant Handler as DocumentHandler
    participant PromptRefiner as Prompt Refiner
    participant AI as AI Model
    participant WebContainer as WebContainer
    participant DB as Database

    %% Creation Flow
    Client->>ReactApp: Create new code artifact (title)
    ReactApp->>ArtifactComp: Render artifact component
    ArtifactComp->>+Handler: onCreateDocument(id, title, dataStream, session)

    %% NEW: Prompt Refinement Step
    Handler->>+PromptRefiner: Refine prompt (title)
    PromptRefiner->>AI: streamObject(model, promptRefinementPrompt, schema)
    AI-->>PromptRefiner: Refined prompt
    PromptRefiner-->>-Handler: Return refined prompt

    %% Continue with refined prompt
    Handler->>+AI: streamObject(model, refinedPrompt, schema)

    loop Content Streaming
        AI-->>Handler: Delta objects with code
        Handler-->>ArtifactComp: dataStream.writeData(content)
        ArtifactComp-->>Client: Render updated code
    end

    AI-->>-Handler: Final content
    Handler->>DB: saveDocument(id, title, content, refinedPrompt, kind, userId)
    Handler-->>-ArtifactComp: Return content

    %% Code Execution Flow
    Client->>ArtifactComp: Execute code
    ArtifactComp->>WebContainer: Write code to files
    WebContainer->>WebContainer: Set up environment
    WebContainer->>WebContainer: Start dev server
    WebContainer-->>ArtifactComp: Execution results/URL
    ArtifactComp-->>Client: Display preview

    %% Update Flow
    Client->>ArtifactComp: Update with description
    ArtifactComp->>+Handler: onUpdateDocument(document, description, dataStream, session)

    %% NEW: Prompt Refinement Step for Updates
    Handler->>+PromptRefiner: Refine prompt (description)
    PromptRefiner->>AI: streamObject(model, promptRefinementPrompt, schema)
    AI-->>PromptRefiner: Refined description
    PromptRefiner-->>-Handler: Return refined description

    Handler->>+AI: streamObject(model, updatePrompt with refinedDescription, schema)

    loop Streaming
        AI-->>Handler: Delta objects with updated code
        Handler-->>ArtifactComp: dataStream.writeData(content)
        ArtifactComp-->>Client: Render updated code
    end

    AI-->>-Handler: Final content
    Handler->>DB: saveDocument(id, title, updatedContent, refinedDescription, kind, userId)
    Handler-->>-ArtifactComp: Return updated content
```

## Implementation Details

1. **Prompt Refinement Process**:

   - When a user provides a title or update description, it's sent to a prompt refinement step
   - The refinement process improves the prompt by adding missing features, fixing formatting, and adding technical details
   - The refined prompt is then used for code generation, resulting in better quality output

2. **Database Changes**:

   - Added a `refined_prompt` column to the `Document` table to store the refined prompts
   - This allows for traceability between the original user prompt and the refined version

3. **Code Flow**:

   - The `refinePrompt` function in `lib/ai/promptRefiner.ts` handles the prompt refinement
   - Both document creation and update processes now include the refinement step
   - The refined prompt is passed to the AI model for code generation
   - The system stores both the generated code and the refined prompt

4. **Benefits**:
   - Improved code quality through better prompts
   - More consistent output with standardized formatting
   - Addition of expected features that users might not have explicitly mentioned
   - Better handling of vague or incomplete specifications
