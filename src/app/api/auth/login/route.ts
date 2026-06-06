import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { handle, password } = await request.json();

    if (!handle || !password) {
      return NextResponse.json(
        { error: "Handle and password are required" },
        { status: 400 }
      );
    }

    const normalized = handle.toLowerCase().replace(/^@/, "");
    const user = await prisma.user.findUnique({ where: { handle: normalized } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid handle or password" },
        { status: 401 }
      );
    }

    const token = await createToken(user.id);
    const response = NextResponse.json({
      id: user.id,
      handle: user.handle,
      name: user.name,
      avatarUrl: user.avatarUrl,
      token,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
