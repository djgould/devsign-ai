import { memo, useState } from "react";

import type { ArtifactKind } from "./artifact";
import { FileIcon, LoaderIcon, MessageIcon, PencilEditIcon } from "./icons";
import { toast } from "sonner";
import { useArtifact } from "@/hooks/use-artifact";
import { fetcher } from "@/lib/utils";

const getActionText = (
  type: "create" | "update" | "request-suggestions",
  tense: "present" | "past"
) => {
  switch (type) {
    case "create":
      return tense === "present" ? "Creating" : "Created";
    case "update":
      return tense === "present" ? "Updating" : "Updated";
    case "request-suggestions":
      return tense === "present"
        ? "Adding suggestions"
        : "Added suggestions to";
    default:
      return null;
  }
};

interface DocumentToolResultProps {
  type: "create" | "update" | "request-suggestions";
  result: { id: string; title: string; kind: ArtifactKind };
  isReadonly: boolean;
}

function PureDocumentToolResult({
  type,
  result,
  isReadonly,
}: DocumentToolResultProps) {
  const { setArtifact } = useArtifact();
  const [isFetching, setIsFetching] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    console.log("🔍 Document clicked:", {
      documentId: result.id,
      title: result.title,
      kind: result.kind,
    });

    if (isReadonly) {
      console.log("❌ Document click rejected - readonly mode");
      toast.error("Viewing files in shared chats is currently not supported.");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const boundingBox = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };

    // Set initial artifact state with empty content
    console.log("📝 Setting initial artifact state with empty content");
    setArtifact({
      documentId: result.id,
      kind: result.kind,
      content: "", // Empty content initially
      title: result.title,
      isVisible: true,
      status: "idle",
      boundingBox,
    });

    // Fetch document content
    try {
      console.log("🔄 Fetching document content for ID:", result.id);
      setIsFetching(true);

      // Fetch the document content
      const documents = await fetcher(`/api/document?id=${result.id}`);

      if (documents && documents.length > 0) {
        const document = documents[0];
        console.log("✅ Document content fetched successfully:", {
          title: document.title,
          id: document.id,
          kind: document.kind,
          contentLength: document.content?.length || 0,
          contentPreview: document.content
            ? document.content.substring(0, 50) + "..."
            : "empty",
        });

        // Update artifact with the actual content
        console.log("📝 Updating artifact with fetched content");
        setArtifact((current) => ({
          ...current,
          content: document.content || "",
          title: document.title,
          kind: document.kind,
        }));
      } else {
        console.log("⚠️ No document found with ID:", result.id);
        toast.error("Document not found");
      }
    } catch (error) {
      console.error("❌ Error fetching document:", error);
      toast.error("Failed to load document content");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <button
      type="button"
      className="bg-background cursor-pointer border py-2 px-3 rounded-xl w-fit flex flex-row gap-3 items-start"
      onClick={handleClick}
    >
      <div className="text-muted-foreground mt-1">
        {isFetching ? (
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        ) : type === "create" ? (
          <FileIcon />
        ) : type === "update" ? (
          <PencilEditIcon />
        ) : type === "request-suggestions" ? (
          <MessageIcon />
        ) : null}
      </div>
      <div className="text-left">
        {`${getActionText(type, "past")} "${result.title}"`}
      </div>
    </button>
  );
}

export const DocumentToolResult = memo(PureDocumentToolResult, () => true);

interface DocumentToolCallProps {
  type: "create" | "update" | "request-suggestions";
  args: { title: string };
  isReadonly: boolean;
}

function PureDocumentToolCall({
  type,
  args,
  isReadonly,
}: DocumentToolCallProps) {
  const { setArtifact } = useArtifact();

  return (
    <button
      type="button"
      className="cursor pointer w-fit border py-2 px-3 rounded-xl flex flex-row items-start justify-between gap-3"
      onClick={(event) => {
        if (isReadonly) {
          toast.error(
            "Viewing files in shared chats is currently not supported."
          );
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();

        const boundingBox = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          isVisible: true,
          boundingBox,
        }));
      }}
    >
      <div className="flex flex-row gap-3 items-start">
        <div className="text-zinc-500 mt-1">
          {type === "create" ? (
            <FileIcon />
          ) : type === "update" ? (
            <PencilEditIcon />
          ) : type === "request-suggestions" ? (
            <MessageIcon />
          ) : null}
        </div>

        <div className="text-left">
          {`${getActionText(type, "present")} ${
            args.title ? `"${args.title}"` : ""
          }`}
        </div>
      </div>

      <div className="animate-spin mt-1">{<LoaderIcon />}</div>
    </button>
  );
}

export const DocumentToolCall = memo(PureDocumentToolCall, () => true);
