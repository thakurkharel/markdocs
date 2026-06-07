import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { resolveUsers } from "@/lib/users";
import { logEvent } from "@/lib/provenance";
import { notifyChange } from "@/lib/realtime";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { userId, source } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        resolved: false,
        resolvedBy: null,
        resolvedAt: null,
      },
    });

    logEvent({
      documentId: comment.documentId,
      authorId: userId,
      action: "comment.unresolved",
      source,
      metadata: { commentId },
    });

    notifyChange(comment.documentId, "comments");

    const userIds = [comment.authorId].filter(Boolean);
    const users = await resolveUsers(userIds);

    return NextResponse.json({
      ...comment,
      author: users.get(comment.authorId) || {
        id: comment.authorId,
        name: null,
        avatarUrl: null,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to unresolve comment" },
      { status: 500 }
    );
  }
}
