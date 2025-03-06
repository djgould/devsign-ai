"use client";

import type { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

import { ChatHeader } from "@/components/chat-header";
import type { Vote } from "@/lib/db/schema";
import { fetcher, generateUUID } from "@/lib/utils";

import { Artifact } from "./artifact";
import { MultimodalInput } from "./multimodal-input";
import { Messages } from "./messages";
import { VisibilityType } from "./visibility-selector";
import { useArtifact, useArtifactSelector } from "@/hooks/use-artifact";
import { toast } from "sonner";

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const { artifact, setArtifact } = useArtifact();
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate("/api/history");
    },
    onError: (error) => {
      toast.error("An error occured, please try again!");
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher
  );

  // Step 2.2: Detect the latest artifact from messages
  useEffect(() => {
    if (artifact.documentId === "init" && messages) {
      const artifactMessage = messages.find(
        (msg) =>
          msg.role === "assistant" &&
          msg.parts &&
          msg.parts.length > 0 &&
          msg.parts[0].type === "tool-invocation" &&
          "toolInvocation" in msg.parts[0] &&
          msg.parts[0].toolInvocation?.toolName === "createDocument"
      );
      if (
        artifactMessage &&
        artifactMessage.parts &&
        artifactMessage.parts[0] &&
        "toolInvocation" in artifactMessage.parts[0] &&
        artifactMessage.parts[0].toolInvocation?.state === "result"
      ) {
        const toolInvocation = artifactMessage.parts[0].toolInvocation;
        setArtifact({
          isVisible: true,
          documentId: toolInvocation?.result?.id || "unknown",
          title: toolInvocation?.result?.title || "",
          kind: toolInvocation?.result?.kind || "code",
          content: toolInvocation?.result?.content || "",
          status: "idle",
          boundingBox: {
            top: 0,
            left: 0,
            width: 800,
            height: 600,
          },
        });
      }
    }
  }, [messages, setArtifact]);

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}
