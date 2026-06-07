import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getDocumentContent, setDocumentContent } from "@/lib/yjs-utils";
import { logEvent } from "@/lib/provenance";
import { notifyChange } from "@/lib/realtime";

interface ReplaceOp {
  op: "replace";
  find: string;
  replace: string;
  occurrence?: number | "first" | "last";
}

interface InsertOp {
  op: "insert";
  after?: string;
  before?: string;
  text: string;
}

interface DeleteOp {
  op: "delete";
  find: string;
  occurrence?: number | "first" | "last";
}

interface CommentOp {
  op: "comment";
  on: string;
  body: string;
  occurrence?: number | "first" | "last";
}

interface SuggestOp {
  op: "suggest";
  find: string;
  replace: string;
  occurrence?: number | "first" | "last";
}

type Operation = ReplaceOp | InsertOp | DeleteOp | CommentOp | SuggestOp;

interface OpResult {
  ok: boolean;
  op: string;
  error?: string;
  id?: string;
}

function findTarget(
  content: string,
  target: string,
  occurrence?: number | "first" | "last"
): { from: number; to: number } | { error: string; candidates?: number } {
  if (!target) return { error: "Empty target string" };

  const indices: number[] = [];
  let pos = 0;
  while (true) {
    const idx = content.indexOf(target, pos);
    if (idx === -1) break;
    indices.push(idx);
    pos = idx + 1;
  }

  if (indices.length === 0) {
    return { error: `Target not found: "${target.slice(0, 80)}"` };
  }

  if (indices.length > 1 && occurrence === undefined) {
    return {
      error: `Target is ambiguous (found ${indices.length} matches). Use "occurrence" to disambiguate.`,
      candidates: indices.length,
    };
  }

  let idx: number;
  if (occurrence === "last") {
    idx = indices[indices.length - 1];
  } else if (occurrence === "first" || occurrence === undefined) {
    idx = indices[0];
  } else {
    const n = typeof occurrence === "number" ? occurrence : 0;
    if (n < 0 || n >= indices.length) {
      return {
        error: `Occurrence ${n} out of range (found ${indices.length} matches, 0-indexed).`,
        candidates: indices.length,
      };
    }
    idx = indices[n];
  }

  return { from: idx, to: idx + target.length };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, source } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id, archivedAt: null },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await request.json();
    const operations: Operation[] = body.operations;

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: "operations array is required" },
        { status: 400 }
      );
    }

    let content = await getDocumentContent(id);
    const results: OpResult[] = [];
    let contentModified = false;

    // Separate content ops and review ops
    const contentOps = operations.filter((o) =>
      ["replace", "insert", "delete"].includes(o.op)
    );
    const reviewOps = operations.filter((o) =>
      ["comment", "suggest"].includes(o.op)
    );

    // Apply content ops first
    for (const op of contentOps) {
      switch (op.op) {
        case "replace": {
          const match = findTarget(content, op.find, op.occurrence);
          if ("error" in match) {
            results.push({ ok: false, op: "replace", error: match.error });
            break;
          }
          content =
            content.slice(0, match.from) + op.replace + content.slice(match.to);
          contentModified = true;
          results.push({ ok: true, op: "replace" });
          break;
        }
        case "delete": {
          const match = findTarget(content, op.find, op.occurrence);
          if ("error" in match) {
            results.push({ ok: false, op: "delete", error: match.error });
            break;
          }
          content = content.slice(0, match.from) + content.slice(match.to);
          contentModified = true;
          results.push({ ok: true, op: "delete" });
          break;
        }
        case "insert": {
          if (op.after) {
            const match = findTarget(content, op.after);
            if ("error" in match) {
              results.push({ ok: false, op: "insert", error: match.error });
              break;
            }
            content =
              content.slice(0, match.to) + op.text + content.slice(match.to);
          } else if (op.before) {
            const match = findTarget(content, op.before);
            if ("error" in match) {
              results.push({ ok: false, op: "insert", error: match.error });
              break;
            }
            content =
              content.slice(0, match.from) +
              op.text +
              content.slice(match.from);
          } else {
            // Append to end
            content += op.text;
          }
          contentModified = true;
          results.push({ ok: true, op: "insert" });
          break;
        }
      }
    }

    // Persist content changes
    if (contentModified) {
      await setDocumentContent(id, content);
      logEvent({
        documentId: id,
        authorId: userId,
        action: "document.content_edited",
        source,
        metadata: { via: "edit_api", ops: contentOps.length },
      });
    }

    // Apply review ops against the (possibly updated) content
    for (const op of reviewOps) {
      switch (op.op) {
        case "comment": {
          const match = findTarget(content, op.on, op.occurrence);
          if ("error" in match) {
            results.push({ ok: false, op: "comment", error: match.error });
            break;
          }
          const comment = await prisma.comment.create({
            data: {
              content: op.body,
              fromPos: match.from,
              toPos: match.to,
              authorId: userId,
              documentId: id,
            },
          });
          logEvent({
            documentId: id,
            authorId: userId,
            action: "comment.added",
            source,
            metadata: { commentId: comment.id, content: op.body },
          });
          notifyChange(id, "comments");
          results.push({ ok: true, op: "comment", id: comment.id });
          break;
        }
        case "suggest": {
          const match = findTarget(content, op.find, op.occurrence);
          if ("error" in match) {
            results.push({ ok: false, op: "suggest", error: match.error });
            break;
          }
          const suggestion = await prisma.suggestion.create({
            data: {
              originalText: op.find,
              suggestedText: op.replace,
              fromPos: match.from,
              toPos: match.to,
              authorId: userId,
              documentId: id,
            },
          });
          logEvent({
            documentId: id,
            authorId: userId,
            action: "suggestion.added",
            source,
            metadata: {
              suggestionId: suggestion.id,
              originalText: op.find,
              suggestedText: op.replace,
            },
          });
          notifyChange(id, "suggestions");
          results.push({ ok: true, op: "suggest", id: suggestion.id });
          break;
        }
      }
    }

    const allOk = results.every((r) => r.ok);

    return NextResponse.json({
      ok: allOk,
      applied: results.filter((r) => r.ok).length,
      results,
      content,
    });
  } catch (error) {
    console.error("Edit API error:", error);
    return NextResponse.json(
      { error: "Failed to process edit operations", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
