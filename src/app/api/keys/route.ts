import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import crypto from "crypto";

function generateApiKey(): string {
  return "mdk_" + crypto.randomBytes(24).toString("hex");
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = body.name || "Default";

  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const prefix = rawKey.slice(0, 12);

  await prisma.apiKey.create({
    data: { userId, name, keyHash, prefix },
  });

  return NextResponse.json({ key: rawKey, prefix, name }, { status: 201 });
}
