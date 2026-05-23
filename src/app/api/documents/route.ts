import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
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
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title } = body;

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
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
