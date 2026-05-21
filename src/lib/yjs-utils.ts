import * as Y from "yjs";
import { prisma } from "./prisma";

/**
 * Create a Yjs state snapshot from plain text content.
 */
export function createYjsState(content: string): Uint8Array {
  const doc = new Y.Doc();
  const ytext = doc.getText("content");
  ytext.insert(0, content);
  const state = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return state;
}

/**
 * Read plain text content from a Yjs state snapshot.
 */
export function readYjsState(state: Uint8Array): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  const text = doc.getText("content").toString();
  doc.destroy();
  return text;
}

/**
 * Get the current text content of a document from its latest snapshot.
 */
export async function getDocumentContent(documentId: string): Promise<string> {
  const snapshot = await prisma.documentSnapshot.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: { yjsState: true },
  });
  if (!snapshot?.yjsState) return "";
  return readYjsState(new Uint8Array(snapshot.yjsState));
}

/**
 * Set the content of a document. If a WS room is active (someone has
 * the doc open), the update is pushed through Yjs so all connected
 * editors see it in real time. Otherwise falls back to writing the
 * snapshot directly to DB.
 */
export async function setDocumentContent(
  documentId: string,
  content: string
): Promise<void> {
  // Try the live WS room first (registered on globalThis by ws.ts)
  const applyContentToRoom: ((docId: string, content: string) => boolean) | undefined =
    (globalThis as any).__markdocs_applyContentToRoom;

  if (applyContentToRoom?.(documentId, content)) {
    // Room handled it — the WS update handler will persist via schedulePersist
    return;
  }

  // No active room — write directly to DB
  const state = Buffer.from(createYjsState(content));
  await prisma.$transaction([
    prisma.documentSnapshot.deleteMany({ where: { documentId } }),
    prisma.documentSnapshot.create({
      data: { documentId, yjsState: state },
    }),
    prisma.document.update({
      where: { id: documentId },
      data: { updatedAt: new Date() },
    }),
  ]);
}
