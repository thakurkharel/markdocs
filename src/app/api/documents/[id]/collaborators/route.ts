import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET: list collaborators for a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await getAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id, archivedAt: null },
    select: { creatorId: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const collaborators = await prisma.documentCollaborator.findMany({
    where: { documentId: id },
    select: { id: true, userId: true, role: true, createdAt: true },
  });

  // Resolve handles/names
  const userIds = [doc.creatorId, ...collaborators.map((c) => c.userId)];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, handle: true, name: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const owner = userMap.get(doc.creatorId);
  const members = collaborators.map((c) => ({
    id: c.id,
    role: c.role,
    createdAt: c.createdAt,
    user: userMap.get(c.userId) || { id: c.userId, handle: "unknown", name: null, avatarUrl: null },
  }));

  return NextResponse.json({
    owner: owner || { id: doc.creatorId, handle: "unknown", name: null, avatarUrl: null },
    collaborators: members,
  });
}

// POST: add a collaborator by handle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await getAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { handle, role = "editor" } = await request.json();

  if (!handle) {
    return NextResponse.json({ error: "Handle is required" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id, archivedAt: null },
    select: { creatorId: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the creator can share
  if (doc.creatorId !== userId) {
    return NextResponse.json({ error: "Only the owner can share this document" }, { status: 403 });
  }

  const normalized = handle.toLowerCase().replace(/^@/, "");
  const targetUser = await prisma.user.findUnique({ where: { handle: normalized } });
  if (!targetUser) {
    return NextResponse.json({ error: `No user with handle @${normalized}` }, { status: 404 });
  }

  if (targetUser.id === userId) {
    return NextResponse.json({ error: "You're already the owner" }, { status: 400 });
  }

  // Upsert collaborator
  const collab = await prisma.documentCollaborator.upsert({
    where: { documentId_userId: { documentId: id, userId: targetUser.id } },
    create: { documentId: id, userId: targetUser.id, role },
    update: { role },
  });

  return NextResponse.json({
    id: collab.id,
    role: collab.role,
    user: { id: targetUser.id, handle: targetUser.handle, name: targetUser.name, avatarUrl: targetUser.avatarUrl },
  }, { status: 201 });
}

// DELETE: remove a collaborator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await getAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { collaboratorId } = await request.json();

  const doc = await prisma.document.findUnique({
    where: { id, archivedAt: null },
    select: { creatorId: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (doc.creatorId !== userId) {
    return NextResponse.json({ error: "Only the owner can remove collaborators" }, { status: 403 });
  }

  await prisma.documentCollaborator.delete({ where: { id: collaboratorId } }).catch(() => {});

  return new NextResponse(null, { status: 204 });
}
