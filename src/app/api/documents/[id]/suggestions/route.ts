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
    const status = searchParams.get("status");

    const where: any = { documentId: id };

    if (status === "pending" || status === "accepted" || status === "rejected") {
      where.status = status;
    }

    const suggestions = await prisma.suggestion.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
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
    const { original_text, suggested_text, from_pos, to_pos } = body;

    if (
      !original_text ||
      !suggested_text ||
      from_pos === undefined ||
      to_pos === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "original_text, suggested_text, from_pos, and to_pos are required",
        },
        { status: 400 }
      );
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        originalText: original_text,
        suggestedText: suggested_text,
        fromPos: from_pos,
        toPos: to_pos,
        authorId: userId,
        documentId: id,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(suggestion, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create suggestion" },
      { status: 500 }
    );
  }
}
