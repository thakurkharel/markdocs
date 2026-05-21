import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { IncomingMessage } from "node:http";
import type { Server as HttpServer } from "node:http";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { prisma } from "./prisma.js";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

interface DocumentRoom {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
  persistTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, DocumentRoom>();

function getDocIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/ws\/([^/?#]+)/);
  return match ? match[1] : null;
}

async function persistDocument(docId: string, doc: Y.Doc): Promise<void> {
  try {
    const state = Buffer.from(Y.encodeStateAsUpdate(doc));
    await prisma.$transaction([
      prisma.documentSnapshot.deleteMany({ where: { documentId: docId } }),
      prisma.documentSnapshot.create({
        data: { documentId: docId, yjsState: state },
      }),
      prisma.document.update({
        where: { id: docId },
        data: { updatedAt: new Date() },
      }),
    ]);
  } catch (error) {
    console.error(`Error persisting document ${docId}:`, error);
  }
}

function schedulePersist(docId: string, room: DocumentRoom): void {
  if (room.persistTimer) clearTimeout(room.persistTimer);
  room.persistTimer = setTimeout(() => {
    persistDocument(docId, room.doc);
    room.persistTimer = null;
  }, 2000);
}

async function loadDocumentState(docId: string, doc: Y.Doc): Promise<void> {
  try {
    const snapshot = await prisma.documentSnapshot.findFirst({
      where: { documentId: docId },
      orderBy: { createdAt: "desc" },
      select: { yjsState: true },
    });
    if (snapshot?.yjsState) {
      Y.applyUpdate(doc, new Uint8Array(snapshot.yjsState));
    }
  } catch (error) {
    console.error(`Error loading document state for ${docId}:`, error);
  }
}

async function getOrCreateRoom(docId: string): Promise<DocumentRoom> {
  let room = rooms.get(docId);
  if (room) return room;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  await loadDocumentState(docId, doc);

  room = { doc, awareness, conns: new Map(), persistTimer: null };
  rooms.set(docId, room);
  return room;
}

function broadcastToRoom(room: DocumentRoom, message: Uint8Array, excludeConn?: WebSocket): void {
  for (const [conn] of room.conns) {
    if (conn !== excludeConn && conn.readyState === WebSocket.OPEN) {
      try { conn.send(message); } catch {}
    }
  }
}

function handleMessage(conn: WebSocket, docId: string, room: DocumentRoom, data: Uint8Array): void {
  try {
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn as unknown as object);
        if (encoding.length(encoder) > 1) conn.send(encoding.toUint8Array(encoder));
        if (syncMessageType === 2) schedulePersist(docId, room);
        break;
      }
      case MESSAGE_AWARENESS: {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(room.awareness, update, conn);
        const awarenessEncoder = encoding.createEncoder();
        encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(awarenessEncoder, update);
        broadcastToRoom(room, encoding.toUint8Array(awarenessEncoder), conn);
        break;
      }
    }
  } catch (error) {
    console.error("Error handling WebSocket message:", error);
  }
}

function removeConnection(conn: WebSocket, docId: string, room: DocumentRoom): void {
  const controlledIds = room.conns.get(conn);
  room.conns.delete(conn);
  if (controlledIds) {
    awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(controlledIds), null);
  }
  if (room.conns.size === 0) {
    if (room.persistTimer) { clearTimeout(room.persistTimer); room.persistTimer = null; }
    persistDocument(docId, room.doc);
    room.awareness.destroy();
    room.doc.destroy();
    rooms.delete(docId);
  }
}

async function setupConnection(conn: WebSocket, docId: string): Promise<void> {
  const room = await getOrCreateRoom(docId);
  room.conns.set(conn, new Set());

  const awarenessChangeHandler = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === conn) {
      const controlledIds = room.conns.get(conn);
      if (controlledIds) {
        changes.added.forEach((id) => controlledIds.add(id));
        changes.removed.forEach((id) => controlledIds.delete(id));
      }
    }
    const changedClients = changes.added.concat(changes.updated, changes.removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(room.awareness, changedClients));
    broadcastToRoom(room, encoding.toUint8Array(encoder));
  };

  room.awareness.on("update", awarenessChangeHandler);

  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(syncEncoder, room.doc);
  conn.send(encoding.toUint8Array(syncEncoder));

  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(awarenessEncoder, awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys())));
    conn.send(encoding.toUint8Array(awarenessEncoder));
  }

  const docUpdateHandler = (update: Uint8Array, origin: unknown) => {
    if (origin === conn) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    broadcastToRoom(room, encoding.toUint8Array(encoder));
  };

  room.doc.on("update", docUpdateHandler);

  conn.on("message", (rawData: RawData) => {
    const data =
      rawData instanceof ArrayBuffer ? new Uint8Array(rawData)
      : rawData instanceof Buffer ? new Uint8Array(rawData.buffer, rawData.byteOffset, rawData.byteLength)
      : new Uint8Array(0);
    handleMessage(conn, docId, room, data);
  });

  conn.on("close", () => {
    room.awareness.off("update", awarenessChangeHandler);
    room.doc.off("update", docUpdateHandler);
    removeConnection(conn, docId, room);
  });

  conn.on("error", () => {
    room.awareness.off("update", awarenessChangeHandler);
    room.doc.off("update", docUpdateHandler);
    removeConnection(conn, docId, room);
  });
}

export function setupWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket, head) => {
    const docId = getDocIdFromUrl(request.url);
    if (!docId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
    const docId = getDocIdFromUrl(request.url);
    if (!docId) { ws.close(); return; }
    console.log(`Client connected to document: ${docId}`);
    setupConnection(ws, docId);
  });

  return wss;
}
