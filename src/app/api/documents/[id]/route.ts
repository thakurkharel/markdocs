import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/users";
import { logEvent } from "@/lib/provenance";
import { hasAccess, getUserRole } from "@/lib/access";

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

    if (!(await hasAccess(id, userId))) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const document = await prisma.document.findUnique({
      where: { id, archivedAt: null },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const creator = await resolveUser(document.creatorId);
    const userRole = await getUserRole(id, userId);
    return NextResponse.json({ ...document, creator, userRole });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, source } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    const role = await getUserRole(id, userId);
    if (!role) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (role === "viewer") {
      return NextResponse.json({ error: "Viewers cannot edit this document" }, { status: 403 });
    }

    const document = await prisma.document.findUnique({
      where: { id, archivedAt: null },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: { ...(title !== undefined && { title }) },
    });

    if (title !== undefined && title !== document.title) {
      logEvent({
        documentId: id,
        authorId: userId,
        action: "document.title_changed",
        source,
        metadata: { oldTitle: document.title, newTitle: title },
      });
    }

    const creator = await resolveUser(updated.creatorId);
    return NextResponse.json({ ...updated, creator });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
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

    // Only the creator can delete
    if (document.creatorId !== userId) {
      return NextResponse.json({ error: "Only the owner can delete this document" }, { status: 403 });
    }

    await prisma.document.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    logEvent({
      documentId: id,
      authorId: userId,
      action: "document.archived",
      source,
      metadata: { title: document.title },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
