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
