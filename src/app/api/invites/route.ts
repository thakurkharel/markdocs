import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

// GET: list invites created by current user
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invites = await prisma.invite.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      claimedBy: true,
      claimedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(invites);
}

// POST: create a new invite
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = randomBytes(16).toString("base64url");
  const invite = await prisma.invite.create({
    data: {
      code,
      createdBy: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    select: { id: true, code: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json(invite, { status: 201 });
}
