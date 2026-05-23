import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getDocumentContent, setDocumentContent } from "@/lib/yjs-utils";
import { logEvent } from "@/lib/provenance";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id, archivedAt: null },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const content = await getDocumentContent(id);
    return NextResponse.json({ id, content });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get document content" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, source } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id, archivedAt: null },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== "string") {
      return NextResponse.json({ error: "content (string) is required" }, { status: 400 });
    }

    await setDocumentContent(id, content);

    logEvent({
      documentId: id,
      authorId: userId,
      action: "document.content_edited",
      source,
      metadata: { length: content.length },
    });

    return NextResponse.json({ id, content });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update document content" }, { status: 500 });
  }
}
