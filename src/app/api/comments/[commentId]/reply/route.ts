import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/users";
import { logEvent } from "@/lib/provenance";
import { notifyChange } from "@/lib/realtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { userId, source } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;

    const parent = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!parent) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Replies attach to the root comment, not nested further
    const rootId = parent.parentId || parent.id;

    const body = await request.json();
    const { content, resolve } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const reply = await prisma.comment.create({
      data: {
        content,
        fromPos: parent.fromPos,
        toPos: parent.toPos,
        authorId: userId,
        documentId: parent.documentId,
        parentId: rootId,
      },
    });

    // Optionally resolve the thread with this reply
    if (resolve) {
      await prisma.comment.update({
        where: { id: rootId },
        data: {
          resolved: true,
          resolvedBy: userId,
          resolvedAt: new Date(),
        },
      });
    }

    logEvent({
      documentId: parent.documentId,
      authorId: userId,
      action: "comment.replied",
      source,
      metadata: { commentId: reply.id, parentId: rootId, content },
    });

    notifyChange(parent.documentId, "comments");

    const author = await resolveUser(userId);
    return NextResponse.json({ ...reply, author }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reply to comment" },
      { status: 500 }
    );
  }
}
