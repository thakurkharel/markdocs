/**
 * Notify connected clients that data has changed for a document.
 * Calls through to the WS server via globalThis (same Node.js process).
 */
export function notifyChange(documentId: string, table: "comments" | "suggestions" | "edit_history"): void {
  const notify: ((docId: string, table: string) => void) | undefined =
    (globalThis as any).__markdocs_notifyDataChange;
  notify?.(documentId, table);
}
