/**
 * Canvas LMS API client with pagination and rate-limit backoff.
 * All calls are server-side only.
 */

export interface CanvasConfig {
  baseUrl: string; // e.g. "https://school.instructure.com"
  token: string;
}

const MAX_PER_PAGE = 100;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

/** Parse Canvas Link header for next page URL */
function getNextUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

/** Sleep with jitter for rate-limit backoff */
function sleep(ms: number): Promise<void> {
  const jitter = Math.random() * ms * 0.3;
  return new Promise((r) => setTimeout(r, ms + jitter));
}

/** Fetch a single page from Canvas with retry + backoff */
async function canvasFetch(
  url: string,
  config: CanvasConfig,
  init?: RequestInit
): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (res.status === 403 && res.headers.get("x-rate-limit-remaining") === "0") {
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
      continue;
    }
    if (res.status === 429) {
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
      continue;
    }
    return res;
  }
  throw new Error(`Canvas API request failed after ${MAX_RETRIES} retries: ${url}`);
}

/** Fetch all pages from a paginated Canvas endpoint */
async function paginatedFetch<T>(
  path: string,
  config: CanvasConfig,
  params: Record<string, string | string[]> = {}
): Promise<T[]> {
  const url = new URL(`/api/v1${path}`, config.baseUrl);
  url.searchParams.set("per_page", String(MAX_PER_PAGE));
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, item);
    } else {
      url.searchParams.set(k, v);
    }
  }

  const results: T[] = [];
  let nextUrl: string | null = url.toString();

  while (nextUrl) {
    const res = await canvasFetch(nextUrl, config);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Canvas API ${res.status}: ${body}`);
    }
    const data = await res.json();
    results.push(...(Array.isArray(data) ? data : []));
    nextUrl = getNextUrl(res.headers.get("link"));
  }

  return results;
}

// --- Public API ---

export interface Course {
  id: number;
  name: string;
  course_code: string;
}

export interface Assignment {
  id: number;
  name: string;
  submission_types: string[];
  has_submitted_submissions: boolean;
}

export interface CanvasUser {
  id: number;
  name: string;
  short_name?: string;
}

export interface Attachment {
  id: number;
  filename: string;
  url: string;
  "content-type": string;
  size: number;
}

export interface Submission {
  id: number;
  user_id: number;
  user?: CanvasUser;
  submission_type: string | null;
  body: string | null;
  workflow_state: string;
  submitted_at: string | null;
  late: boolean;
  missing: boolean;
  attempt: number | null;
  attachments?: Attachment[];
  submission_comments?: SubmissionComment[];
}

export interface SubmissionComment {
  id: number;
  author_id: number;
  comment: string;
  created_at: string;
}

export async function getSelf(config: CanvasConfig): Promise<CanvasUser> {
  const url = new URL("/api/v1/users/self", config.baseUrl);
  const res = await canvasFetch(url.toString(), config);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Canvas API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function listCourses(config: CanvasConfig): Promise<Course[]> {
  return paginatedFetch<Course>("/courses", config, {
    enrollment_type: "teacher",
    state: "available",
  });
}

export async function listAssignments(
  config: CanvasConfig,
  courseId: number
): Promise<Assignment[]> {
  return paginatedFetch<Assignment>(
    `/courses/${courseId}/assignments`,
    config,
    { order_by: "due_at" }
  );
}

export async function listSubmissions(
  config: CanvasConfig,
  courseId: number,
  assignmentId: number,
  includeComments = false
): Promise<Submission[]> {
  const includes = ["user"];
  if (includeComments) {
    includes.push("submission_comments");
  }
  return paginatedFetch<Submission>(
    `/courses/${courseId}/assignments/${assignmentId}/submissions`,
    config,
    { "include[]": includes }
  );
}

export async function postComment(
  config: CanvasConfig,
  courseId: number,
  assignmentId: number,
  userId: number,
  comment: string
): Promise<{ ok: boolean; error?: string }> {
  const url = new URL(
    `/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
    config.baseUrl
  );
  const res = await canvasFetch(url.toString(), config, {
    method: "PUT",
    body: JSON.stringify({
      comment: { text_comment: comment },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `Canvas ${res.status}: ${body}` };
  }
  return { ok: true };
}

export async function downloadAttachment(
  config: CanvasConfig,
  fileUrl: string
): Promise<string> {
  const res = await canvasFetch(fileUrl, config);
  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status}`);
  }
  return res.text();
}
