import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { resolveUsers } from "@/lib/users";
import { logEvent } from "@/lib/provenance";
import { createYjsState } from "@/lib/yjs-utils";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: {
        archivedAt: null,
        OR: [
          { creatorId: userId },
          { collaborators: { some: { userId } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    const userIds = [...new Set(documents.map((d) => d.creatorId))];
    const users = await resolveUsers(userIds);

    const enriched = documents.map((doc) => ({
      ...doc,
      creator: users.get(doc.creatorId) || { id: doc.creatorId, name: null, avatarUrl: null },
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, source } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Find an org the user belongs to, or create a "Personal" org
    let orgMember = await prisma.orgMember.findFirst({
      where: { userId },
    });

    if (!orgMember) {
      const org = await prisma.organization.create({
        data: {
          name: "Personal",
          slug: `personal-${userId}`,
          members: {
            create: {
              userId,
              role: "owner",
            },
          },
        },
      });

      orgMember = await prisma.orgMember.findFirst({
        where: { userId, orgId: org.id },
      });
    }

    const document = await prisma.document.create({
      data: {
        title,
        creatorId: userId,
        orgId: orgMember!.orgId,
      },
    });

    // Write initial content as a Yjs snapshot if provided
    if (content) {
      const state = Buffer.from(createYjsState(content));
      await prisma.documentSnapshot.create({
        data: { documentId: document.id, yjsState: state },
      });
    }

    logEvent({
      documentId: document.id,
      authorId: userId,
      action: "document.created",
      source,
      metadata: { title },
    });

    const users = await resolveUsers([userId]);
    return NextResponse.json({
      ...document,
      creator: users.get(userId) || { id: userId, name: null, avatarUrl: null },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
