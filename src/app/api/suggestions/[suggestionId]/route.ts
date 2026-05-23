import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { suggestionId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    if (status !== "accepted" && status !== "rejected") {
      return NextResponse.json(
        { error: "status must be 'accepted' or 'rejected'" },
        { status: 400 }
      );
    }

    const suggestion = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        status,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        resolver: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(suggestion);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update suggestion" },
      { status: 500 }
    );
  }
}
