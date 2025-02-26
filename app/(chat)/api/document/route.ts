import { auth } from "@/app/(auth)/auth";
import { ArtifactKind } from "@/components/artifact";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from "@/lib/db/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  console.log("📃 API: Document GET request for ID:", id);

  if (!id) {
    console.log("❌ API: Missing document ID");
    return new Response("Missing id", { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    console.log("❌ API: Unauthorized - no session or user");
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("🔍 API: Fetching documents with ID:", id);
  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    console.log("❌ API: Document not found with ID:", id);
    return new Response("Not Found", { status: 404 });
  }

  if (document.userId !== session.user.id) {
    console.log(
      "❌ API: Unauthorized - document user ID doesn't match session user ID"
    );
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("✅ API: Document found:", {
    id: document.id,
    title: document.title,
    kind: document.kind,
    contentLength: document.content?.length || 0,
  });

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  if (session.user?.id) {
    const document = await saveDocument({
      id,
      content,
      title,
      kind,
      userId: session.user.id,
    });

    return Response.json(document, { status: 200 });
  }
  return new Response("Unauthorized", { status: 401 });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (document.userId !== session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return new Response("Deleted", { status: 200 });
}
