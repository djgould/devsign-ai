import { z } from "zod";
import { streamObject, DataStreamWriter } from "ai";
import { myProvider } from "@/lib/ai/models";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
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

    // Initial draft content based on the title
    const { fullStream } = streamObject({
      model: myProvider.languageModel("artifact-model"),
      system: codePrompt,
      prompt: title,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.writeData({
            type: "code-delta",
            content: code,
            language: "javascript", // Always set to JavaScript
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
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
      const { fullStream } = streamObject({
        model: myProvider.languageModel("artifact-model"),
        system: updateDocumentPrompt(document.content, "code"),
        prompt: description,
        schema: z.object({
          code: z.string(),
        }),
      });

      console.log("Stream object created, processing deltas...");

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === "object") {
          const { object } = delta;
          const { code } = object;

          if (code) {
            console.log("Received code delta, length:", code.length);

            dataStream.writeData({
              type: "code-delta",
              content: code,
              language: "javascript", // Always set to JavaScript
            });

            draftContent = code;
          }
        }
      }

      console.log(
        "Document update completed successfully, content length:",
        draftContent.length
      );
      return draftContent;
    } catch (error) {
      console.error("Error updating document:", error);
      throw error;
    }
  },
});
