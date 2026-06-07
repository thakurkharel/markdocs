#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import * as client from "./client.js";
import { loadConfig, saveConfig, configPath } from "./config.js";

const program = new Command();

program
  .name("markdocs")
  .description("MarkDocs CLI — collaborative markdown editor")
  .version("0.0.1");

// ─── List documents ──────────────────────────────────────────────────────────

program
  .command("list")
  .description("List all documents")
  .action(async () => {
    const spinner = ora("Fetching documents...").start();
    try {
      const docs = (await client.listDocuments()) as Array<Record<string, unknown>>;
      spinner.stop();

      if (!docs || docs.length === 0) {
        console.log(chalk.yellow("No documents found."));
        return;
      }

      console.log(chalk.bold("\nDocuments:\n"));
      console.log(
        chalk.gray(
          padEnd("ID", 40) + padEnd("Title", 40) + padEnd("Updated", 24)
        )
      );
      console.log(chalk.gray("─".repeat(104)));

      for (const doc of docs) {
        console.log(
          padEnd(String(doc.id ?? ""), 40) +
            padEnd(String(doc.title ?? ""), 40) +
            padEnd(String(doc.updatedAt ?? ""), 24)
        );
      }
      console.log();
    } catch (err) {
      spinner.fail("Failed to list documents");
      printError(err);
    }
  });

// ─── Create document ─────────────────────────────────────────────────────────

program
  .command("create")
  .description("Create a new document")
  .argument("<title>", "Document title")
  .option("--content <md>", "Markdown content")
  .option("--file <path>", "Read content from a file")
  .action(async (title: string, opts: { content?: string; file?: string }) => {
    const spinner = ora("Creating document...").start();
    try {
      let content = opts.content;
      if (opts.file) {
        content = await readFile(opts.file, "utf-8");
      }
      const doc = (await client.createDocument(title, content)) as Record<string, unknown>;
      spinner.succeed(chalk.green(`Document created: ${doc.id}`));
      console.log(chalk.gray(`  Title: ${doc.title}`));
    } catch (err) {
      spinner.fail("Failed to create document");
      printError(err);
    }
  });

// ─── Open document in browser ────────────────────────────────────────────────

program
  .command("open")
  .description("Open document in browser")
  .argument("<id>", "Document ID")
  .action((id: string) => {
    const baseUrl = process.env.MARKDOCS_URL || "http://localhost:3001";
    const url = `${baseUrl}/doc/${id}`;
    console.log(chalk.blue(`Opening ${url} ...`));
    exec(`open ${url}`, (err) => {
      if (err) {
        console.error(chalk.red(`Failed to open browser: ${err.message}`));
      }
    });
  });

// ─── View document ───────────────────────────────────────────────────────────

program
  .command("view")
  .description("View document details")
  .argument("<id>", "Document ID")
  .action(async (id: string) => {
    const spinner = ora("Fetching document...").start();
    try {
      const doc = (await client.getDocument(id)) as Record<string, unknown>;
      spinner.stop();

      console.log(chalk.bold.underline(`\n${doc.title}\n`));
      console.log(chalk.gray(`ID: ${doc.id}`));
      console.log(chalk.gray(`Created: ${doc.createdAt ?? ""}`));
      console.log(chalk.gray(`Updated: ${doc.updatedAt ?? ""}`));
      console.log(chalk.gray(`Visibility: ${doc.visibility ?? "org"}`));
      console.log();
    } catch (err) {
      spinner.fail("Failed to fetch document");
      printError(err);
    }
  });

// ─── Delete document ─────────────────────────────────────────────────────────

program
  .command("delete")
  .description("Delete a document")
  .argument("<id>", "Document ID")
  .action(async (id: string) => {
    const spinner = ora("Deleting document...").start();
    try {
      await client.deleteDocument(id);
      spinner.succeed(chalk.green(`Document ${id} deleted.`));
    } catch (err) {
      spinner.fail("Failed to delete document");
      printError(err);
    }
  });

// ─── Comment commands ────────────────────────────────────────────────────────

const comment = program.command("comment").description("Manage comments");

comment
  .command("list")
  .description("List comments on a document")
  .argument("<doc-id>", "Document ID")
  .action(async (docId: string) => {
    const spinner = ora("Fetching comments...").start();
    try {
      const comments = (await client.listComments(docId)) as Array<Record<string, unknown>>;
      spinner.stop();

      if (!comments || comments.length === 0) {
        console.log(chalk.yellow("No comments found."));
        return;
      }

      console.log(chalk.bold("\nComments:\n"));
      console.log(
        chalk.gray(
          padEnd("ID", 40) +
            padEnd("Author", 20) +
            padEnd("Resolved", 10) +
            "Content"
        )
      );
      console.log(chalk.gray("─".repeat(100)));

      for (const c of comments) {
        const resolved = c.resolved ? chalk.green("Yes") : chalk.red("No");
        const author = (c.author as Record<string, unknown>)?.name ?? "Unknown";
        console.log(
          padEnd(String(c.id ?? ""), 40) +
            padEnd(String(author), 20) +
            padEnd(resolved, 10) +
            String(c.content ?? "")
        );
      }
      console.log();
    } catch (err) {
      spinner.fail("Failed to list comments");
      printError(err);
    }
  });

comment
  .command("add")
  .description("Add a comment to a document (use --on for text targeting, or --from/--to for position targeting)")
  .argument("<doc-id>", "Document ID")
  .requiredOption("--content <text>", "Comment text")
  .option("--on <text>", "Text to anchor the comment on (text-based targeting)")
  .option("--from <pos>", "Start position", parseInt)
  .option("--to <pos>", "End position", parseInt)
  .action(
    async (
      docId: string,
      opts: { content: string; on?: string; from?: number; to?: number }
    ) => {
      // Text-based targeting via edit API
      if (opts.on) {
        const spinner = ora("Adding comment...").start();
        try {
          const result = await client.editDocument(docId, [
            { op: "comment", on: opts.on, body: opts.content },
          ]);
          const res = result as Record<string, unknown>;
          if (res.ok) {
            spinner.succeed(chalk.green("Comment added."));
          } else {
            spinner.fail("Comment failed");
            const results = (res.results as Array<Record<string, unknown>>) || [];
            for (const r of results) {
              if (!r.ok) console.error(chalk.red(`  ${r.error}`));
            }
          }
          return;
        } catch (err) {
          spinner.fail("Failed to add comment");
          printError(err);
          return;
        }
      }

      // Position-based fallback
      if (opts.from === undefined || opts.to === undefined) {
        console.error(chalk.red("Use --on <text>, or --from/--to for position targeting"));
        process.exit(1);
      }
      const spinner = ora("Adding comment...").start();
      try {
        const result = await client.addComment(docId, {
          content: opts.content,
          from_pos: opts.from,
          to_pos: opts.to,
        });
        spinner.succeed(chalk.green("Comment added."));
        console.log(chalk.gray(JSON.stringify(result, null, 2)));
      } catch (err) {
        spinner.fail("Failed to add comment");
        printError(err);
      }
    }
  );

comment
  .command("resolve")
  .description("Resolve a comment")
  .argument("<comment-id>", "Comment ID")
  .action(async (commentId: string) => {
    const spinner = ora("Resolving comment...").start();
    try {
      await client.resolveComment(commentId);
      spinner.succeed(chalk.green(`Comment ${commentId} resolved.`));
    } catch (err) {
      spinner.fail("Failed to resolve comment");
      printError(err);
    }
  });

comment
  .command("delete")
  .description("Delete a comment")
  .argument("<comment-id>", "Comment ID")
  .action(async (commentId: string) => {
    const spinner = ora("Deleting comment...").start();
    try {
      await client.deleteComment(commentId);
      spinner.succeed(chalk.green(`Comment ${commentId} deleted.`));
    } catch (err) {
      spinner.fail("Failed to delete comment");
      printError(err);
    }
  });

comment
  .command("reply")
  .description("Reply to a comment thread")
  .argument("<comment-id>", "Comment ID to reply to")
  .requiredOption("--content <text>", "Reply text")
  .option("--resolve", "Resolve the thread with this reply")
  .action(
    async (
      commentId: string,
      opts: { content: string; resolve?: boolean }
    ) => {
      const spinner = ora("Replying...").start();
      try {
        const result = await client.replyToComment(
          commentId,
          opts.content,
          opts.resolve
        );
        spinner.succeed(chalk.green("Reply added."));
        console.log(chalk.gray(JSON.stringify(result, null, 2)));
      } catch (err) {
        spinner.fail("Failed to reply");
        printError(err);
      }
    }
  );

comment
  .command("unresolve")
  .description("Unresolve a previously resolved comment")
  .argument("<comment-id>", "Comment ID")
  .action(async (commentId: string) => {
    const spinner = ora("Unresolving comment...").start();
    try {
      await client.unresolveComment(commentId);
      spinner.succeed(chalk.green(`Comment ${commentId} unresolved.`));
    } catch (err) {
      spinner.fail("Failed to unresolve comment");
      printError(err);
    }
  });

comment
  .command("threads")
  .description("List comments as threaded conversations")
  .argument("<doc-id>", "Document ID")
  .action(async (docId: string) => {
    const spinner = ora("Fetching threads...").start();
    try {
      const threads = (await client.listCommentsThreaded(docId)) as Array<
        Record<string, unknown>
      >;
      spinner.stop();

      if (!threads || threads.length === 0) {
        console.log(chalk.yellow("No comment threads found."));
        return;
      }

      for (const t of threads) {
        const resolved = t.resolved ? chalk.green("[resolved]") : "";
        const author =
          (t.author as Record<string, unknown>)?.name ?? "Unknown";
        console.log(
          chalk.bold(`\n${author}`) +
            ` ${resolved} ` +
            chalk.gray(`(${String(t.id).slice(0, 8)}...)`)
        );
        console.log(`  ${t.content}`);
        const replies = (t.replies as Array<Record<string, unknown>>) || [];
        for (const r of replies) {
          const rAuthor =
            (r.author as Record<string, unknown>)?.name ?? "Unknown";
          console.log(chalk.gray(`    ${rAuthor}: `) + String(r.content));
        }
      }
      console.log();
    } catch (err) {
      spinner.fail("Failed to list threads");
      printError(err);
    }
  });

// ─── Suggestion commands ─────────────────────────────────────────────────────

const suggest = program.command("suggest").description("Manage suggestions");

suggest
  .command("list")
  .description("List suggestions on a document")
  .argument("<doc-id>", "Document ID")
  .action(async (docId: string) => {
    const spinner = ora("Fetching suggestions...").start();
    try {
      const suggestions = (await client.listSuggestions(docId)) as Array<
        Record<string, unknown>
      >;
      spinner.stop();

      if (!suggestions || suggestions.length === 0) {
        console.log(chalk.yellow("No suggestions found."));
        return;
      }

      console.log(chalk.bold("\nSuggestions:\n"));
      console.log(
        chalk.gray(
          padEnd("ID", 40) +
            padEnd("Author", 20) +
            padEnd("Status", 12) +
            padEnd("Original", 24) +
            "Suggested"
        )
      );
      console.log(chalk.gray("─".repeat(120)));

      for (const s of suggestions) {
        const status = formatStatus(String(s.status ?? ""));
        const author = (s.author as Record<string, unknown>)?.name ?? "Unknown";
        console.log(
          padEnd(String(s.id ?? ""), 40) +
            padEnd(String(author), 20) +
            padEnd(status, 12) +
            padEnd(truncate(String(s.originalText ?? ""), 22), 24) +
            truncate(String(s.suggestedText ?? ""), 30)
        );
      }
      console.log();
    } catch (err) {
      spinner.fail("Failed to list suggestions");
      printError(err);
    }
  });

suggest
  .command("add")
  .description("Add a suggestion to a document (use --find/--replace for text targeting, or --original/--suggested with --from/--to for position targeting)")
  .argument("<doc-id>", "Document ID")
  .option("--find <text>", "Text to find (text-based targeting)")
  .option("--replace <text>", "Suggested replacement (text-based targeting)")
  .option("--original <text>", "Original text (position-based)")
  .option("--suggested <text>", "Suggested replacement text (position-based)")
  .option("--from <pos>", "Start position", parseInt)
  .option("--to <pos>", "End position", parseInt)
  .action(
    async (
      docId: string,
      opts: {
        find?: string;
        replace?: string;
        original?: string;
        suggested?: string;
        from?: number;
        to?: number;
      }
    ) => {
      // Text-based targeting via edit API
      if (opts.find && opts.replace) {
        const spinner = ora("Adding suggestion...").start();
        try {
          const result = await client.editDocument(docId, [
            { op: "suggest", find: opts.find, replace: opts.replace },
          ]);
          const res = result as Record<string, unknown>;
          if (res.ok) {
            spinner.succeed(chalk.green("Suggestion added."));
          } else {
            spinner.fail("Suggestion failed");
            const results = (res.results as Array<Record<string, unknown>>) || [];
            for (const r of results) {
              if (!r.ok) console.error(chalk.red(`  ${r.error}`));
            }
          }
          return;
        } catch (err) {
          spinner.fail("Failed to add suggestion");
          printError(err);
          return;
        }
      }

      // Position-based fallback
      if (!opts.original || !opts.suggested || opts.from === undefined || opts.to === undefined) {
        console.error(chalk.red("Use --find/--replace, or --original/--suggested with --from/--to"));
        process.exit(1);
      }
      const spinner = ora("Adding suggestion...").start();
      try {
        const result = await client.addSuggestion(docId, {
          original_text: opts.original,
          suggested_text: opts.suggested,
          from_pos: opts.from,
          to_pos: opts.to,
        });
        spinner.succeed(chalk.green("Suggestion added."));
        console.log(chalk.gray(JSON.stringify(result, null, 2)));
      } catch (err) {
        spinner.fail("Failed to add suggestion");
        printError(err);
      }
    }
  );

suggest
  .command("accept")
  .description("Accept a suggestion")
  .argument("<suggestion-id>", "Suggestion ID")
  .action(async (suggestionId: string) => {
    const spinner = ora("Accepting suggestion...").start();
    try {
      await client.updateSuggestion(suggestionId, "accepted");
      spinner.succeed(chalk.green(`Suggestion ${suggestionId} accepted.`));
    } catch (err) {
      spinner.fail("Failed to accept suggestion");
      printError(err);
    }
  });

suggest
  .command("reject")
  .description("Reject a suggestion")
  .argument("<suggestion-id>", "Suggestion ID")
  .action(async (suggestionId: string) => {
    const spinner = ora("Rejecting suggestion...").start();
    try {
      await client.updateSuggestion(suggestionId, "rejected");
      spinner.succeed(chalk.green(`Suggestion ${suggestionId} rejected.`));
    } catch (err) {
      spinner.fail("Failed to reject suggestion");
      printError(err);
    }
  });

// ─── History ─────────────────────────────────────────────────────────────────

program
  .command("history")
  .description("Show edit history for a document")
  .argument("<doc-id>", "Document ID")
  .action(async (docId: string) => {
    const spinner = ora("Fetching history...").start();
    try {
      const history = (await client.getHistory(docId)) as Array<Record<string, unknown>>;
      spinner.stop();

      if (!history || history.length === 0) {
        console.log(chalk.yellow("No history entries found."));
        return;
      }

      console.log(chalk.bold("\nEdit History:\n"));
      console.log(
        chalk.gray(
          padEnd("Timestamp", 28) +
            padEnd("Author", 20) +
            "Action"
        )
      );
      console.log(chalk.gray("─".repeat(80)));

      for (const entry of history) {
        const author = (entry.author as Record<string, unknown>)?.name ?? "Unknown";
        console.log(
          padEnd(String(entry.createdAt ?? ""), 28) +
            padEnd(String(author), 20) +
            String(entry.action ?? "")
        );
      }
      console.log();
    } catch (err) {
      spinner.fail("Failed to fetch history");
      printError(err);
    }
  });

// ─── Content commands ────────────────────────────────────────────────────────

program
  .command("content")
  .description("Get the markdown content of a document")
  .argument("<doc-id>", "Document ID")
  .action(async (docId: string) => {
    const spinner = ora({ text: "Fetching content...", stream: process.stderr }).start();
    try {
      const result = (await client.getDocumentContent(docId)) as Record<string, unknown>;
      spinner.stop();
      console.log(String(result.content ?? ""));
    } catch (err) {
      spinner.fail("Failed to get content");
      printError(err);
    }
  });

program
  .command("edit")
  .description("Update the markdown content of a document")
  .argument("<doc-id>", "Document ID")
  .option("--content <md>", "New markdown content")
  .option("--file <path>", "Read content from a file")
  .action(async (docId: string, opts: { content?: string; file?: string }) => {
    if (!opts.content && !opts.file) {
      console.error(chalk.red("Provide --content or --file"));
      process.exit(1);
    }
    const spinner = ora("Updating content...").start();
    try {
      let content = opts.content;
      if (opts.file) {
        content = await readFile(opts.file, "utf-8");
      }
      await client.updateDocumentContent(docId, content!);
      spinner.succeed(chalk.green("Document content updated."));
    } catch (err) {
      spinner.fail("Failed to update content");
      printError(err);
    }
  });

program
  .command("replace")
  .description("Find and replace text in a document")
  .argument("<doc-id>", "Document ID")
  .requiredOption("--find <text>", "Text to find")
  .requiredOption("--replace <text>", "Replacement text")
  .action(async (docId: string, opts: { find: string; replace: string }) => {
    const spinner = ora("Applying edit...").start();
    try {
      const result = await client.editDocument(docId, [
        { op: "replace", find: opts.find, replace: opts.replace },
      ]);
      const res = result as Record<string, unknown>;
      if (res.ok) {
        spinner.succeed(chalk.green("Text replaced."));
      } else {
        spinner.fail("Edit failed");
        const results = (res.results as Array<Record<string, unknown>>) || [];
        for (const r of results) {
          if (!r.ok) console.error(chalk.red(`  ${r.error}`));
        }
      }
    } catch (err) {
      spinner.fail("Failed to edit document");
      printError(err);
    }
  });

// ─── Share commands ─────────────────────────────────────────────────────────

const share = program.command("share").description("Manage document sharing");

share
  .command("list")
  .description("List collaborators on a document")
  .argument("<doc-id>", "Document ID")
  .action(async (docId: string) => {
    const spinner = ora("Fetching collaborators...").start();
    try {
      const result = (await client.listCollaborators(docId)) as {
        owner: Record<string, unknown>;
        collaborators: Array<Record<string, unknown>>;
      };
      spinner.stop();

      const owner = result.owner;
      console.log(chalk.bold("\nOwner:\n"));
      console.log(`  @${owner.handle} ${chalk.gray(owner.name ? `(${owner.name})` : "")}`);

      if (result.collaborators.length > 0) {
        console.log(chalk.bold("\nCollaborators:\n"));
        console.log(
          chalk.gray(
            padEnd("ID", 40) + padEnd("Handle", 20) + padEnd("Role", 10) + "Name"
          )
        );
        console.log(chalk.gray("─".repeat(80)));
        for (const c of result.collaborators) {
          const user = c.user as Record<string, unknown>;
          console.log(
            padEnd(String(c.id ?? ""), 40) +
              padEnd(`@${user.handle}`, 20) +
              padEnd(String(c.role ?? ""), 10) +
              String(user.name ?? "")
          );
        }
      } else {
        console.log(chalk.yellow("\nNo collaborators."));
      }
      console.log();
    } catch (err) {
      spinner.fail("Failed to list collaborators");
      printError(err);
    }
  });

share
  .command("add")
  .description("Share a document with a user")
  .argument("<doc-id>", "Document ID")
  .argument("<handle>", "User handle (e.g. @john)")
  .option("--role <role>", "Role: editor or viewer", "editor")
  .action(async (docId: string, handle: string, opts: { role: string }) => {
    const spinner = ora(`Sharing with @${handle.replace(/^@/, "")}...`).start();
    try {
      const result = (await client.shareDocument(docId, handle, opts.role)) as Record<
        string,
        unknown
      >;
      const user = result.user as Record<string, unknown>;
      spinner.succeed(
        chalk.green(`Shared with @${user.handle} as ${result.role}.`)
      );
    } catch (err) {
      spinner.fail("Failed to share document");
      printError(err);
    }
  });

share
  .command("remove")
  .description("Remove a collaborator from a document")
  .argument("<doc-id>", "Document ID")
  .argument("<collaborator-id>", "Collaborator ID (from share list)")
  .action(async (docId: string, collaboratorId: string) => {
    const spinner = ora("Removing collaborator...").start();
    try {
      await client.unshareDocument(docId, collaboratorId);
      spinner.succeed(chalk.green("Collaborator removed."));
    } catch (err) {
      spinner.fail("Failed to remove collaborator");
      printError(err);
    }
  });

// ─── Users command ──────────────────────────────────────────────────────────

program
  .command("users")
  .description("List all users in the workspace")
  .action(async () => {
    const spinner = ora("Fetching users...").start();
    try {
      const users = (await client.listUsers()) as Array<Record<string, unknown>>;
      spinner.stop();

      if (!users || users.length === 0) {
        console.log(chalk.yellow("No users found."));
        return;
      }

      console.log(chalk.bold("\nUsers:\n"));
      console.log(
        chalk.gray(padEnd("Handle", 24) + padEnd("Name", 30) + "ID")
      );
      console.log(chalk.gray("─".repeat(90)));

      for (const u of users) {
        console.log(
          padEnd(`@${u.handle}`, 24) +
            padEnd(String(u.name ?? ""), 30) +
            String(u.id ?? "")
        );
      }
      console.log();
    } catch (err) {
      spinner.fail("Failed to list users");
      printError(err);
    }
  });

// ─── Auth commands ──────────────────────────────────────────────────────────

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(question);
      let input = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      const onData = (char: string) => {
        if (char === "\n" || char === "\r") {
          process.stdin.setRawMode(false);
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          rl.close();
          resolve(input);
        } else if (char === "\u0003") {
          process.exit();
        } else if (char === "\u007F") {
          input = input.slice(0, -1);
        } else {
          input += char;
        }
      };
      process.stdin.on("data", onData);
    } else {
      rl.question(hidden ? question : question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

program
  .command("login")
  .description("Log in to a MarkDocs instance")
  .option("--url <url>", "Server URL")
  .option("--handle <handle>", "Your handle")
  .action(async (opts: { url?: string; handle?: string }) => {
    try {
      const config = await loadConfig();
      const url = opts.url || config.url || process.env.MARKDOCS_URL || await prompt("Server URL (http://localhost:3001): ") || "http://localhost:3001";
      const handle = opts.handle || await prompt("Handle: ");
      const password = await prompt("Password: ", true);

      if (!handle || !password) {
        console.error(chalk.red("Handle and password are required."));
        process.exit(1);
      }

      const spinner = ora("Logging in...").start();
      const result = await client.login(handle, password, url);
      spinner.succeed(chalk.green(`Logged in as @${result.handle}`));

      await saveConfig({
        ...config,
        url,
        handle: result.handle,
        token: result.token,
      });
      console.log(chalk.gray(`  Config saved to ${configPath()}`));
      console.log();
      console.log(chalk.gray("  Run 'markdocs setup' to create an API key for CLI/MCP use."));
    } catch (err) {
      printError(err);
      process.exit(1);
    }
  });

program
  .command("setup")
  .description("Create an API key after login (for CLI and MCP server)")
  .option("--name <name>", "Key name", "CLI")
  .action(async (opts: { name: string }) => {
    try {
      const config = await loadConfig();
      if (!config.token) {
        console.error(chalk.red("Not logged in. Run 'markdocs login' first."));
        process.exit(1);
      }

      const spinner = ora("Creating API key...").start();
      const result = await client.createApiKey(opts.name, config.token);
      spinner.succeed(chalk.green("API key created."));

      await saveConfig({
        ...config,
        apiKey: result.key,
      });

      console.log();
      console.log(chalk.gray(`  Key:    ${result.key}`));
      console.log(chalk.gray(`  Prefix: ${result.prefix}`));
      console.log(chalk.gray(`  Saved to ${configPath()}`));
      console.log();
      console.log(chalk.gray("  You're all set. The CLI and MCP server will use this key automatically."));
    } catch (err) {
      printError(err);
      process.exit(1);
    }
  });

program
  .command("whoami")
  .description("Show current auth status")
  .action(async () => {
    const config = await loadConfig();
    if (config.apiKey) {
      console.log(`  Authenticated with API key (${config.apiKey.slice(0, 12)}...)`);
    } else if (config.token) {
      console.log(`  Authenticated with JWT (logged in as @${config.handle || "unknown"})`);
    } else if (process.env.MARKDOCS_API_KEY) {
      console.log(`  Authenticated via MARKDOCS_API_KEY env var`);
    } else {
      console.log(chalk.yellow("  Not authenticated. Run 'markdocs login'."));
    }
    console.log(chalk.gray(`  Server: ${config.url || process.env.MARKDOCS_URL || "http://localhost:3001"}`));
    console.log(chalk.gray(`  Config: ${configPath()}`));
  });

program
  .command("logout")
  .description("Clear saved credentials")
  .action(async () => {
    const config = await loadConfig();
    await saveConfig({
      url: config.url,
    });
    console.log(chalk.green("  Logged out. Credentials cleared."));
  });

// ─── MCP subcommand ──────────────────────────────────────────────────────────

program
  .command("mcp")
  .description("Start MCP server (stdio transport)")
  .action(async () => {
    const { startMcpServer } = await import("./mcp.js");
    await startMcpServer();
  });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function padEnd(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len - 1) + " ";
  return str + " ".repeat(len - str.length);
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + "\u2026";
}

function formatStatus(status: string): string {
  switch (status) {
    case "accepted":
      return chalk.green(status);
    case "rejected":
      return chalk.red(status);
    case "pending":
      return chalk.yellow(status);
    default:
      return status;
  }
}

function printError(err: unknown): void {
  if (err instanceof Error) {
    console.error(chalk.red(err.message));
  } else {
    console.error(chalk.red(String(err)));
  }
}

program.parse();
