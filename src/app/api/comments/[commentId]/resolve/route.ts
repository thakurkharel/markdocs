import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        resolved: true,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        resolver: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(comment);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to resolve comment" },
      { status: 500 }
    );
  }
}
