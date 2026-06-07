import { prisma } from "./prisma";

/**
 * Check if a user has access to a document (creator or collaborator).
 */
export async function hasAccess(documentId: string, userId: string): Promise<boolean> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId, archivedAt: null },
    select: {
      creatorId: true,
      collaborators: { where: { userId }, select: { id: true }, take: 1 },
    },
  });
  if (!doc) return false;
  return doc.creatorId === userId || doc.collaborators.length > 0;
}

/**
 * Get the user's role for a document: "owner", "editor", "viewer", or null if no access.
 */
export async function getUserRole(documentId: string, userId: string): Promise<string | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId, archivedAt: null },
    select: {
      creatorId: true,
      collaborators: { where: { userId }, select: { role: true }, take: 1 },
    },
  });
  if (!doc) return null;
  if (doc.creatorId === userId) return "owner";
  if (doc.collaborators.length > 0) return doc.collaborators[0].role;
  return null;
}
