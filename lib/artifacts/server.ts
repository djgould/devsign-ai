import { codeDocumentHandler } from "@/artifacts/code/server";
import { ArtifactKind } from "@/components/artifact";
import { DataStreamWriter } from "ai";
import { Document } from "../db/schema";
import { saveDocument } from "../db/queries";
import { Session } from "next-auth";

export interface SaveDocumentProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}

export interface CreateDocumentCallbackProps {
  id: string;
  title: string;
  dataStream: DataStreamWriter;
  session: Session;
}

export interface UpdateDocumentCallbackProps {
  document: Document;
  description: string;
  dataStream: DataStreamWriter;
  session: Session;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
}

export interface DocumentResult {
  content: string;
  refinedPrompt?: string;
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (
    params: CreateDocumentCallbackProps
  ) => Promise<string | DocumentResult>;
  onUpdateDocument: (
    params: UpdateDocumentCallbackProps
  ) => Promise<string | DocumentResult>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const result = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        dataStream: args.dataStream,
        session: args.session,
      });

      // Handle both string and DocumentResult return types
      const content = typeof result === "string" ? result : result.content;
      const refinedPrompt =
        typeof result === "string" ? undefined : result.refinedPrompt;

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.id,
          title: args.title,
          content,
          refinedPrompt,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const result = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        session: args.session,
      });

      // Handle both string and DocumentResult return types
      const content = typeof result === "string" ? result : result.content;
      const refinedPrompt =
        typeof result === "string" ? undefined : result.refinedPrompt;

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content,
          refinedPrompt,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  codeDocumentHandler,
];

export const artifactKinds = ["text", "code", "image", "sheet"] as const;
