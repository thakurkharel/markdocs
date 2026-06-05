import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { resolveUsers, resolveUser } from "@/lib/users";
import { notifyChange } from "@/lib/realtime";

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

    const history = await prisma.editHistory.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
    });

    const userIds = [...new Set(history.map((h) => h.authorId))];
    const users = await resolveUsers(userIds);

    const enriched = history.map((h) => ({
      ...h,
      author: users.get(h.authorId) || { id: h.authorId, name: null, avatarUrl: null },
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch edit history" }, { status: 500 });
  }
}

export async function POST(
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
    const { action, diff, metadata } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const entry = await prisma.editHistory.create({
      data: {
        action,
        diff,
        source,
        metadata: metadata ?? undefined,
        authorId: userId,
        documentId: id,
      },
    });

    notifyChange(id, "edit_history");

    const author = await resolveUser(userId);
    return NextResponse.json({ ...entry, author }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to record edit history" }, { status: 500 });
  }
}
