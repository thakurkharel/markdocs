import { prisma } from "@/lib/prisma";
import type { AuthSource } from "@/lib/api-auth";

export type ProvenanceAction =
  | "document.created"
  | "document.title_changed"
  | "document.archived"
  | "document.content_edited"
  | "comment.added"
  | "comment.resolved"
  | "comment.deleted"
  | "suggestion.added"
  | "suggestion.accepted"
  | "suggestion.rejected";

interface LogEventParams {
  documentId: string;
  authorId: string;
  action: ProvenanceAction;
  source: AuthSource;
  metadata?: Record<string, unknown>;
  diff?: string;
}

/**
 * Log a provenance event to the edit history.
 * Fire-and-forget — errors are swallowed to avoid blocking API responses.
 */
export function logEvent(params: LogEventParams): void {
  prisma.editHistory
    .create({
      data: {
        documentId: params.documentId,
        authorId: params.authorId,
        action: params.action,
        source: params.source,
        metadata: (params.metadata as any) ?? undefined,
        diff: params.diff ?? undefined,
      },
    })
    .catch((err) => {
      console.error("[provenance] Failed to log event:", params.action, err);
    });
}
