import { prisma } from "./prisma";

export interface UserInfo {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

const UNKNOWN_USER: UserInfo = { id: "unknown", name: "Unknown", avatarUrl: null };

/**
 * Resolve user info from the local database for a list of user IDs.
 */
export async function resolveUsers(userIds: string[]): Promise<Map<string, UserInfo>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const result = new Map<string, UserInfo>();

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true, avatarUrl: true },
    });

    for (const u of users) {
      result.set(u.id, { id: u.id, name: u.name, avatarUrl: u.avatarUrl });
    }

    // Fill missing
    for (const id of unique) {
      if (!result.has(id)) {
        result.set(id, { ...UNKNOWN_USER, id });
      }
    }
  } catch {
    for (const id of unique) {
      result.set(id, { ...UNKNOWN_USER, id });
    }
  }

  return result;
}

export async function resolveUser(userId: string): Promise<UserInfo> {
  const map = await resolveUsers([userId]);
  return map.get(userId) || { ...UNKNOWN_USER, id: userId };
}
