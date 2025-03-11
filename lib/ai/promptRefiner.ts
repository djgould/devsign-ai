import { z } from "zod";
import { streamObject } from "ai";
import { myProvider } from "@/lib/ai/models";
import { promptRefinementPrompt } from "@/lib/ai/prompts";

/**
 * Refines a user prompt to improve code generation quality
 *
 * @param originalPrompt The original user prompt
 * @returns A refined version of the prompt with added details and improvements
 */
export async function refinePrompt(originalPrompt: string): Promise<string> {
  try {
    // Log the original prompt with clear formatting
    console.log("\n==== PROMPT REFINEMENT PROCESS ====");
    console.log("📝 ORIGINAL PROMPT:");
    console.log("-----------------------------");
    console.log(originalPrompt);
    console.log("-----------------------------");

    const { fullStream } = streamObject({
      model: myProvider.languageModel("artifact-model"),
      system: promptRefinementPrompt,
      prompt: originalPrompt,
      schema: z.object({
        refinedPrompt: z.string(),
      }),
    });

    let refinedPrompt = "";
    for await (const delta of fullStream) {
      if (delta.type === "object") {
        const { object } = delta;
        if (object.refinedPrompt) {
          refinedPrompt = object.refinedPrompt;
        }
      }
    }

    // If refinement failed or returned empty, use the original prompt
    if (!refinedPrompt) {
      console.warn(
        "⚠️ Prompt refinement returned empty result, using original prompt"
      );
      return originalPrompt;
    }

    // Log the refined prompt with clear formatting
    console.log("📝 REFINED PROMPT:");
    console.log("-----------------------------");
    console.log(refinedPrompt);
    console.log("-----------------------------");

    // Log a summary of the changes
    console.log("📊 REFINEMENT SUMMARY:");
    console.log(`- Original prompt: ${originalPrompt.length} characters`);
    console.log(`- Refined prompt: ${refinedPrompt.length} characters`);
    console.log(
      `- Difference: ${
        refinedPrompt.length - originalPrompt.length
      } characters (${(
        (refinedPrompt.length / originalPrompt.length) * 100 -
        100
      ).toFixed(1)}%)`
    );
    console.log("==== END REFINEMENT PROCESS ====\n");

    return refinedPrompt;
  } catch (error) {
    console.error("Error refining prompt:", error);
    // Fallback to original prompt on error
    return originalPrompt;
  }
}
