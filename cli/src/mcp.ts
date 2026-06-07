import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as client from "./client.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "markdocs",
    version: "0.0.1",
  });

  // ─── Tools ───────────────────────────────────────────────────────────────────

  server.tool("list_documents", "List all documents", {}, async () => {
    try {
      const docs = await client.listDocuments();
      return {
        content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
      };
    } catch (err) {
      return errorResult("Failed to list documents", err);
    }
  });

  server.tool(
    "create_document",
    "Create a new document",
    {
      title: z.string().describe("Document title"),
      content: z.string().optional().describe("Markdown content"),
    },
    async ({ title, content }) => {
      try {
        const doc = await client.createDocument(title, content);
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to create document", err);
      }
    }
  );

  server.tool(
    "get_document",
    "Get document by ID",
    {
      id: z.string().describe("Document ID"),
    },
    async ({ id }) => {
      try {
        const doc = await client.getDocument(id);
        return {
          content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to get document", err);
      }
    }
  );

  server.tool(
    "delete_document",
    "Delete a document",
    {
      id: z.string().describe("Document ID"),
    },
    async ({ id }) => {
      try {
        await client.deleteDocument(id);
        return {
          content: [{ type: "text", text: `Document ${id} deleted successfully.` }],
        };
      } catch (err) {
        return errorResult("Failed to delete document", err);
      }
    }
  );

  server.tool(
    "list_comments",
    "List comments on a document",
    {
      document_id: z.string().describe("Document ID"),
      resolved: z.boolean().optional().describe("Filter by resolved status"),
    },
    async ({ document_id, resolved }) => {
      try {
        const comments = await client.listComments(document_id, resolved);
        return {
          content: [{ type: "text", text: JSON.stringify(comments, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to list comments", err);
      }
    }
  );

  server.tool(
    "add_comment",
    "Add a comment to a document",
    {
      document_id: z.string().describe("Document ID"),
      content: z.string().describe("Comment text"),
      from_pos: z.number().describe("Start position in the document"),
      to_pos: z.number().describe("End position in the document"),
    },
    async ({ document_id, content, from_pos, to_pos }) => {
      try {
        const result = await client.addComment(document_id, {
          content,
          from_pos,
          to_pos,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to add comment", err);
      }
    }
  );

  server.tool(
    "resolve_comment",
    "Resolve a comment",
    {
      comment_id: z.string().describe("Comment ID"),
    },
    async ({ comment_id }) => {
      try {
        const result = await client.resolveComment(comment_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to resolve comment", err);
      }
    }
  );

  server.tool(
    "delete_comment",
    "Delete a comment",
    {
      comment_id: z.string().describe("Comment ID"),
    },
    async ({ comment_id }) => {
      try {
        await client.deleteComment(comment_id);
        return {
          content: [{ type: "text", text: `Comment ${comment_id} deleted successfully.` }],
        };
      } catch (err) {
        return errorResult("Failed to delete comment", err);
      }
    }
  );

  server.tool(
    "list_suggestions",
    "List suggestions on a document",
    {
      document_id: z.string().describe("Document ID"),
      status: z
        .enum(["pending", "accepted", "rejected"])
        .optional()
        .describe("Filter by status"),
    },
    async ({ document_id, status }) => {
      try {
        const suggestions = await client.listSuggestions(document_id, status);
        return {
          content: [{ type: "text", text: JSON.stringify(suggestions, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to list suggestions", err);
      }
    }
  );

  server.tool(
    "add_suggestion",
    "Add a suggestion to a document",
    {
      document_id: z.string().describe("Document ID"),
      original_text: z.string().describe("Original text to replace"),
      suggested_text: z.string().describe("Suggested replacement text"),
      from_pos: z.number().describe("Start position in the document"),
      to_pos: z.number().describe("End position in the document"),
    },
    async ({ document_id, original_text, suggested_text, from_pos, to_pos }) => {
      try {
        const result = await client.addSuggestion(document_id, {
          original_text,
          suggested_text,
          from_pos,
          to_pos,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to add suggestion", err);
      }
    }
  );

  server.tool(
    "accept_suggestion",
    "Accept a suggestion",
    {
      suggestion_id: z.string().describe("Suggestion ID"),
    },
    async ({ suggestion_id }) => {
      try {
        const result = await client.updateSuggestion(suggestion_id, "accepted");
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to accept suggestion", err);
      }
    }
  );

  server.tool(
    "reject_suggestion",
    "Reject a suggestion",
    {
      suggestion_id: z.string().describe("Suggestion ID"),
    },
    async ({ suggestion_id }) => {
      try {
        const result = await client.updateSuggestion(suggestion_id, "rejected");
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to reject suggestion", err);
      }
    }
  );

  server.tool(
    "edit_document",
    "Edit a document using text-based targeting. Operations find visible text by content, not by character position. Content ops (replace, insert, delete) apply first, then review ops (comment, suggest).",
    {
      document_id: z.string().describe("Document ID"),
      operations: z.array(z.object({
        op: z.enum(["replace", "insert", "delete", "comment", "suggest"]).describe("Operation type"),
        find: z.string().optional().describe("Text to find (for replace, delete, suggest)"),
        replace: z.string().optional().describe("Replacement text (for replace, suggest)"),
        on: z.string().optional().describe("Text to anchor on (for comment)"),
        body: z.string().optional().describe("Comment body (for comment)"),
        text: z.string().optional().describe("Text to insert (for insert)"),
        after: z.string().optional().describe("Insert after this text (for insert)"),
        before: z.string().optional().describe("Insert before this text (for insert)"),
        occurrence: z.union([z.number(), z.enum(["first", "last"])]).optional().describe("Which occurrence if target appears multiple times (0-indexed number, 'first', or 'last')"),
      })).describe("Array of edit operations"),
    },
    async ({ document_id, operations }) => {
      try {
        const result = await client.editDocument(document_id, operations);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to edit document", err);
      }
    }
  );

  server.tool(
    "reply_to_comment",
    "Reply to a comment thread",
    {
      comment_id: z.string().describe("Comment ID to reply to"),
      content: z.string().describe("Reply text"),
      resolve: z.boolean().optional().describe("Resolve the thread with this reply"),
    },
    async ({ comment_id, content, resolve }) => {
      try {
        const result = await client.replyToComment(comment_id, content, resolve);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to reply to comment", err);
      }
    }
  );

  server.tool(
    "unresolve_comment",
    "Unresolve a previously resolved comment",
    {
      comment_id: z.string().describe("Comment ID"),
    },
    async ({ comment_id }) => {
      try {
        const result = await client.unresolveComment(comment_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to unresolve comment", err);
      }
    }
  );

  server.tool(
    "list_comment_threads",
    "List comments as threaded conversations (root comments with nested replies)",
    {
      document_id: z.string().describe("Document ID"),
      resolved: z.boolean().optional().describe("Filter by resolved status"),
    },
    async ({ document_id, resolved }) => {
      try {
        const threads = await client.listCommentsThreaded(document_id, resolved);
        return {
          content: [{ type: "text", text: JSON.stringify(threads, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to list comment threads", err);
      }
    }
  );

  server.tool(
    "get_history",
    "Get edit history for a document",
    {
      document_id: z.string().describe("Document ID"),
    },
    async ({ document_id }) => {
      try {
        const history = await client.getHistory(document_id);
        return {
          content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to get history", err);
      }
    }
  );

  server.tool(
    "get_document_content",
    "Get the markdown content of a document",
    {
      document_id: z.string().describe("Document ID"),
    },
    async ({ document_id }) => {
      try {
        const result = await client.getDocumentContent(document_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to get document content", err);
      }
    }
  );

  server.tool(
    "update_document_content",
    "Update the markdown content of a document",
    {
      document_id: z.string().describe("Document ID"),
      content: z.string().describe("New markdown content"),
    },
    async ({ document_id, content }) => {
      try {
        const result = await client.updateDocumentContent(document_id, content);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to update document content", err);
      }
    }
  );

  server.tool("list_users", "List all users in the workspace", {}, async () => {
    try {
      const users = await client.listUsers();
      return {
        content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
      };
    } catch (err) {
      return errorResult("Failed to list users", err);
    }
  });

  server.tool(
    "list_collaborators",
    "List collaborators on a document (owner and shared users)",
    {
      document_id: z.string().describe("Document ID"),
    },
    async ({ document_id }) => {
      try {
        const result = await client.listCollaborators(document_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to list collaborators", err);
      }
    }
  );

  server.tool(
    "share_document",
    "Share a document with a user by their handle",
    {
      document_id: z.string().describe("Document ID"),
      handle: z.string().describe("User handle (e.g. 'john' or '@john')"),
      role: z
        .enum(["editor", "viewer"])
        .optional()
        .default("editor")
        .describe("Role to grant (default: editor)"),
    },
    async ({ document_id, handle, role }) => {
      try {
        const result = await client.shareDocument(document_id, handle, role);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return errorResult("Failed to share document", err);
      }
    }
  );

  server.tool(
    "unshare_document",
    "Remove a collaborator from a document",
    {
      document_id: z.string().describe("Document ID"),
      collaborator_id: z.string().describe("Collaborator ID (from list_collaborators)"),
    },
    async ({ document_id, collaborator_id }) => {
      try {
        await client.unshareDocument(document_id, collaborator_id);
        return {
          content: [
            { type: "text", text: `Collaborator ${collaborator_id} removed successfully.` },
          ],
        };
      } catch (err) {
        return errorResult("Failed to unshare document", err);
      }
    }
  );

  // ─── Resources ───────────────────────────────────────────────────────────────

  server.resource(
    "documents_list",
    "markdocs://documents",
    async (uri) => {
      const docs = await client.listDocuments();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(docs, null, 2),
          },
        ],
      };
    }
  );

  server.resource(
    "document_by_id",
    "markdocs://documents/{id}",
    async (uri) => {
      const id = uri.pathname.split("/").pop() ?? "";
      const doc = await client.getDocument(id);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(doc, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

function errorResult(message: string, err: unknown) {
  const detail = err instanceof Error ? err.message : String(err);
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: `${message}: ${detail}` }],
  };
}

export async function startMcpServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Allow running directly
const isDirectRun =
  process.argv[1]?.endsWith("mcp.ts") || process.argv[1]?.endsWith("mcp.js");
if (isDirectRun) {
  startMcpServer().catch((err) => {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  });
}
