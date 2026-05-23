import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

/**
 * Authenticate a request via Clerk session OR API key.
 * Returns the user ID if authenticated, null otherwise.
 *
 * CLI/MCP clients use: Authorization: Bearer <MARKDOCS_API_KEY>
 * Browser clients use: Clerk session cookies
 */
export async function getAuthUserId(request?: NextRequest): Promise<string | null> {
  // Check for API key in Authorization header
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const apiKey = process.env.MARKDOCS_API_KEY;
      if (apiKey && token === apiKey) {
        // API key auth — use a configured service user ID
        return process.env.MARKDOCS_SERVICE_USER_ID || "service-user";
      }
    }
  }

  // Fall back to Clerk session auth
  const { userId } = await auth();
  return userId;
}
