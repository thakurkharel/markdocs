import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get("resolved");
    const parentId = searchParams.get("parentId");

    const where: any = { documentId: id };

    if (resolved === "true") {
      where.resolved = true;
    } else if (resolved === "false") {
      where.resolved = false;
    }

    if (parentId) {
      where.parentId = parentId;
    } else if (parentId === null && searchParams.has("parentId")) {
      where.parentId = null;
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id, archivedAt: null },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content, from_pos, to_pos, parent_id } = body;

    if (!content || from_pos === undefined || to_pos === undefined) {
      return NextResponse.json(
        { error: "content, from_pos, and to_pos are required" },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        fromPos: from_pos,
        toPos: to_pos,
        authorId: userId,
        documentId: id,
        parentId: parent_id || null,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
