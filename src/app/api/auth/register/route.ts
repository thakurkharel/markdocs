import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { handle, password, name, invite } = await request.json();

    if (!handle || !password) {
      return NextResponse.json(
        { error: "Handle and password are required" },
        { status: 400 }
      );
    }

    const normalized = handle.toLowerCase().replace(/^@/, "");

    if (!/^[a-z0-9_-]{2,32}$/.test(normalized)) {
      return NextResponse.json(
        { error: "Handle must be 2-32 characters: letters, numbers, hyphens, underscores" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // If an invite code is provided, validate it
    let inviteRecord = null;
    if (invite) {
      inviteRecord = await prisma.invite.findUnique({ where: { code: invite } });
      if (!inviteRecord || inviteRecord.claimedBy) {
        return NextResponse.json({ error: "Invalid or already used invite" }, { status: 400 });
      }
      if (inviteRecord.expiresAt && inviteRecord.expiresAt < new Date()) {
        return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
      }
    }

    const existing = await prisma.user.findUnique({ where: { handle: normalized } });
    if (existing) {
      return NextResponse.json(
        { error: "That handle is already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user and mark invite as claimed in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { handle: normalized, passwordHash, name: name || null },
        select: { id: true, handle: true, name: true, avatarUrl: true },
      });

      if (inviteRecord) {
        await tx.invite.update({
          where: { id: inviteRecord.id },
          data: { claimedBy: u.id, claimedAt: new Date() },
        });
      }

      return u;
    });

    const token = await createToken(user.id);
    const response = NextResponse.json(user, { status: 201 });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
