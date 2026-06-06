import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, verifyToken } from "@/lib/auth";
import crypto from "crypto";

export type AuthSource = "web" | "api";

export interface AuthResult {
  userId: string | null;
  source: AuthSource;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Authenticate a request via session cookie OR API key.
 * Returns the user ID and source channel.
 *
 * CLI/MCP clients use: Authorization: Bearer <API_KEY>  -> source: "api"
 * Browser clients use: Session cookie                    -> source: "web"
 */
export async function getAuth(request?: NextRequest): Promise<AuthResult> {
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const keyHash = hashKey(token);

      const apiKey = await prisma.apiKey.findFirst({
        where: {
          keyHash,
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      if (apiKey) {
        prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        return { userId: apiKey.userId, source: "api" };
      }

      // Try as JWT token (from CLI login)
      const jwtUserId = await verifyToken(token);
      if (jwtUserId) {
        return { userId: jwtUserId, source: "api" };
      }

      return { userId: null, source: "api" };
    }
  }

  const userId = await getCurrentUserId();
  return { userId, source: "web" };
}

export async function getAuthUserId(request?: NextRequest): Promise<string | null> {
  const { userId } = await getAuth(request);
  return userId;
}
