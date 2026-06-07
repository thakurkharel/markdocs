import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { resolveUsers, resolveUser } from "@/lib/users";
import { logEvent } from "@/lib/provenance";
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
    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get("resolved");
    const parentId = searchParams.get("parentId");

    const where: any = { documentId: id };

    if (resolved === "true") where.resolved = true;
    else if (resolved === "false") where.resolved = false;

    if (parentId) where.parentId = parentId;
    else if (parentId === null && searchParams.has("parentId")) where.parentId = null;

    const threaded = searchParams.get("threaded") === "true";

    const comments = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    const userIds = [...new Set(comments.map((c) => c.authorId))];
    const users = await resolveUsers(userIds);

    const enriched = comments.map((c) => ({
      ...c,
      author: users.get(c.authorId) || { id: c.authorId, name: null, avatarUrl: null },
    }));

    if (threaded) {
      // Group into threads: root comments with nested replies
      const roots = enriched.filter((c) => !c.parentId);
      const replies = enriched.filter((c) => c.parentId);
      const threadMap = new Map<string, typeof enriched>();
      for (const reply of replies) {
        const arr = threadMap.get(reply.parentId!) || [];
        arr.push(reply);
        threadMap.set(reply.parentId!, arr);
      }
      const threads = roots.map((root) => ({
        ...root,
        replies: threadMap.get(root.id) || [],
      }));
      return NextResponse.json(threads);
    }

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
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
    });

    logEvent({
      documentId: id,
      authorId: userId,
      action: "comment.added",
      source,
      metadata: { commentId: comment.id, content, fromPos: from_pos, toPos: to_pos },
    });

    notifyChange(id, "comments");

    const author = await resolveUser(userId);
    return NextResponse.json({ ...comment, author }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
