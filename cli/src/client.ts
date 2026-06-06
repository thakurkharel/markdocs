const BASE_URL = process.env.MARKDOCS_URL || "http://localhost:3001";
const API_KEY = process.env.MARKDOCS_API_KEY || "";

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value);
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`API error ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listDocuments(): Promise<unknown> {
  return request("/api/documents");
}

export async function createDocument(title: string, content?: string): Promise<unknown> {
  return request("/api/documents", {
    method: "POST",
    body: { title, content },
  });
}

export async function getDocument(id: string): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(id)}`);
}

export async function deleteDocument(id: string): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function listComments(
  docId: string,
  resolved?: boolean
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (resolved !== undefined) {
    params.resolved = String(resolved);
  }
  return request(`/api/documents/${encodeURIComponent(docId)}/comments`, {
    params,
  });
}

export async function addComment(
  docId: string,
  data: { content: string; from_pos: number; to_pos: number }
): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(docId)}/comments`, {
    method: "POST",
    body: data,
  });
}

export async function resolveComment(commentId: string): Promise<unknown> {
  return request(`/api/comments/${encodeURIComponent(commentId)}/resolve`, {
    method: "PATCH",
  });
}

export async function deleteComment(commentId: string): Promise<unknown> {
  return request(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
  });
}

export async function listSuggestions(
  docId: string,
  status?: string
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (status !== undefined) {
    params.status = status;
  }
  return request(`/api/documents/${encodeURIComponent(docId)}/suggestions`, {
    params,
  });
}

export async function addSuggestion(
  docId: string,
  data: {
    original_text: string;
    suggested_text: string;
    from_pos: number;
    to_pos: number;
  }
): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(docId)}/suggestions`, {
    method: "POST",
    body: data,
  });
}

export async function updateSuggestion(
  suggestionId: string,
  status: string
): Promise<unknown> {
  return request(`/api/suggestions/${encodeURIComponent(suggestionId)}`, {
    method: "PATCH",
    body: { status },
  });
}

export async function getHistory(docId: string): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(docId)}/history`);
}

export async function getDocumentContent(docId: string): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(docId)}/content`);
}

export async function updateDocumentContent(docId: string, content: string): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(docId)}/content`, {
    method: "PUT",
    body: { content },
  });
}

export async function listCollaborators(docId: string): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(docId)}/collaborators`);
}

export async function shareDocument(
  docId: string,
  handle: string,
  role: string = "editor"
): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(docId)}/collaborators`, {
    method: "POST",
    body: { handle, role },
  });
}

export async function unshareDocument(
  docId: string,
  collaboratorId: string
): Promise<unknown> {
  return request(`/api/documents/${encodeURIComponent(docId)}/collaborators`, {
    method: "DELETE",
    body: { collaboratorId },
  });
}

export async function listUsers(): Promise<unknown> {
  return request("/api/users");
}
