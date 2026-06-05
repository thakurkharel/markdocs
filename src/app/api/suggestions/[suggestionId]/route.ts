import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { resolveUsers } from "@/lib/users";
import { logEvent } from "@/lib/provenance";
import { notifyChange } from "@/lib/realtime";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  try {
    const { userId, source } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { suggestionId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || (status !== "accepted" && status !== "rejected")) {
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
    });

    logEvent({
      documentId: suggestion.documentId,
      authorId: userId,
      action: status === "accepted" ? "suggestion.accepted" : "suggestion.rejected",
      source,
      metadata: {
        suggestionId,
        originalText: suggestion.originalText,
        suggestedText: suggestion.suggestedText,
      },
    });

    notifyChange(suggestion.documentId, "suggestions");

    const userIds = [suggestion.authorId, suggestion.resolvedBy].filter(Boolean) as string[];
    const users = await resolveUsers(userIds);

    return NextResponse.json({
      ...suggestion,
      author: users.get(suggestion.authorId) || { id: suggestion.authorId, name: null, avatarUrl: null },
      resolver: suggestion.resolvedBy ? users.get(suggestion.resolvedBy) || null : null,
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
  }
}
