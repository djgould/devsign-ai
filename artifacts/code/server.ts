import { z } from "zod";
import { streamObject, DataStreamWriter } from "ai";
import { myProvider } from "@/lib/ai/models";
import {
  artifactsPrompt,
  codePrompt,
  updateDocumentPrompt,
  createDocumentPrompt,
} from "@/lib/ai/prompts";
import { refinePrompt } from "@/lib/ai/promptRefiner";
import {
  createDocumentHandler,
  CreateDocumentCallbackProps,
  UpdateDocumentCallbackProps,
} from "@/lib/artifacts/server";

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({
    title,
    dataStream,
  }: CreateDocumentCallbackProps) => {
    let draftContent = "";

    // Refine the user prompt to improve code generation
    console.log("🔍 ORIGINAL PROMPT:", title);
    const refinedPrompt = await refinePrompt(title);
    console.log("✨ REFINED PROMPT:", refinedPrompt);

    // Log the differences for easier comparison
    console.log("📊 PROMPT COMPARISON:");
    console.log("- Original length:", title.length, "characters");
    console.log("- Refined length:", refinedPrompt.length, "characters");
    console.log(
      "- Difference:",
      refinedPrompt.length - title.length,
      "characters"
    );

    // Generate code based on the refined prompt
    const { fullStream } = streamObject({
      model: myProvider.languageModel("artifact-model"),
      system: createDocumentPrompt("code"),
      prompt: refinedPrompt,
      schema: z.object({
        code: z.string().optional(),
        response: z.string().optional(),
      }),
    });

    console.log("🔍 Stream object created, processing deltas...");
    // Check for stream errors or empty stream
    if (!fullStream) {
      console.error("❌ Stream is empty or undefined");
      throw new Error("Stream creation failed");
    }

    console.log("✅ Stream validation passed");

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        let codeContent = "";

        // Handle both direct code and JSON with response field
        if (object.code) {
          codeContent = object.code;
        } else if (object.response) {
          codeContent = object.response;
        }

        if (codeContent) {
          console.log("Received code delta, length:", codeContent.length);
          dataStream.writeData({
            type: "code-delta",
            content: codeContent,
            language: "javascript", // Always set to JavaScript
          });

          draftContent = codeContent;
        }
      }
    }

    // Return both the draft content and the refined prompt
    return { content: draftContent, refinedPrompt };
  },
  onUpdateDocument: async ({
    document,
    description,
    dataStream,
  }: UpdateDocumentCallbackProps) => {
    let draftContent = "";

    console.log("Starting document update:", {
      documentId: document.id,
      documentTitle: document.title,
      description:
        description.substring(0, 100) + (description.length > 100 ? "..." : ""),
    });

    try {
      // Refine the update description to improve code generation
      console.log("🔍 ORIGINAL UPDATE DESCRIPTION:");
      console.log(description);

      const refinedDescription = await refinePrompt(description);

      console.log("✨ REFINED UPDATE DESCRIPTION:");
      console.log(refinedDescription);

      // Log the differences for easier comparison
      console.log("📊 DESCRIPTION COMPARISON:");
      console.log("- Original length:", description.length, "characters");
      console.log("- Refined length:", refinedDescription.length, "characters");
      console.log(
        "- Difference:",
        refinedDescription.length - description.length,
        "characters"
      );
      const { fullStream } = streamObject({
        model: myProvider.languageModel("artifact-model"),
        system: updateDocumentPrompt(document.content, "code"),
        prompt: refinedDescription,
        schema: z.object({
          code: z.string().optional(),
          response: z.string().optional(),
        }),
      });

      console.log("Stream object created, processing deltas...");

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === "object") {
          const { object } = delta;
          let codeContent = "";

          // Handle both direct code and JSON with response field
          if (object.code) {
            codeContent = object.code;
          } else if (object.response) {
            codeContent = object.response;
          }

          if (codeContent) {
            console.log("Received code delta, length:", codeContent.length);

            dataStream.writeData({
              type: "code-delta",
              content: codeContent,
              language: "javascript", // Always set to JavaScript
            });

            draftContent = codeContent;
          }
        }
      }

      console.log(
        "Document update completed successfully, content length:",
        draftContent.length
      );
      // Return both the draft content and the refined prompt
      return { content: draftContent, refinedPrompt: refinedDescription };
    } catch (error) {
      console.error("Error updating document:", error);
      throw error;
    }
  },
});
