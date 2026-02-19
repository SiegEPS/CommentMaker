"use client";

import { useState } from "react";

// --- Types ---
interface Course {
  id: number;
  name: string;
  course_code: string;
}
interface Assignment {
  id: number;
  name: string;
  submission_types: string[];
}
interface Attachment {
  id: number;
  filename: string;
  url: string;
  size: number;
}
interface Submission {
  id: number;
  user_id: number;
  user?: { id: number; name: string };
  submission_type: string | null;
  body: string | null;
  workflow_state: string;
  late: boolean;
  missing: boolean;
  attachments?: Attachment[];
}
interface Draft {
  userId: number;
  draft: string;
  reasoning: string;
  confidence: string;
}

// --- Helpers ---
function canvasHeaders(url: string, token: string) {
  return { "x-canvas-url": url, "x-canvas-token": token };
}

// --- Steps ---
type Step = "setup" | "course" | "assignments" | "drafts";

export default function Home() {
  // Setup
  const [canvasUrl, setCanvasUrl] = useState("");
  const [canvasToken, setCanvasToken] = useState("");
  const [step, setStep] = useState<Step>("setup");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<number | null>(null);
  const [refAssignmentId, setRefAssignmentId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [styleGuide, setStyleGuide] = useState<string>("");
  const [dryRun, setDryRun] = useState(true);
  const [postResults, setPostResults] = useState<Record<number, string>>({});

  async function apiFetch(path: string, opts?: RequestInit) {
    setError("");
    const res = await fetch(path, {
      ...opts,
      headers: {
        ...canvasHeaders(canvasUrl, canvasToken),
        "Content-Type": "application/json",
        ...opts?.headers,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return res.json();
  }

  async function connectCanvas() {
    setLoading(true);
    try {
      const [coursesData, selfData] = await Promise.all([
        apiFetch("/api/canvas/courses"),
        apiFetch("/api/canvas/self"),
      ]);
      setCourses(coursesData);
      setTeacherId(selfData.id);
      setStep("course");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
    setLoading(false);
  }

  async function selectCourse(id: number) {
    setCourseId(id);
    setLoading(true);
    try {
      const data = await apiFetch(`/api/canvas/assignments?courseId=${id}`);
      setAssignments(data);
      setStep("assignments");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load assignments");
    }
    setLoading(false);
  }

  function hasPyAttachment(s: Submission): boolean {
    return (
      s.submission_type === "online_upload" &&
      !!s.attachments?.some((a) => a.filename.endsWith(".py"))
    );
  }

  async function getSubmissionText(s: Submission): Promise<string | null> {
    if (s.submission_type === "online_text_entry" && s.body) {
      return s.body;
    }
    if (hasPyAttachment(s)) {
      const pyFile = s.attachments!.find((a) => a.filename.endsWith(".py"))!;
      const data = await apiFetch(
        `/api/canvas/file?url=${encodeURIComponent(pyFile.url)}&filename=${encodeURIComponent(pyFile.filename)}`
      );
      return data.text;
    }
    return null;
  }

  async function generateDrafts() {
    if (!courseId || !currentAssignmentId) return;
    setLoading(true);
    try {
      // Fetch style guide from reference assignment if selected
      let guide = "";
      if (refAssignmentId && teacherId) {
        setError(""); // clear
        const sgResult = await apiFetch("/api/style-guide", {
          method: "POST",
          body: JSON.stringify({
            courseId,
            assignmentId: refAssignmentId,
            teacherId,
          }),
        });
        guide = sgResult.styleGuide ?? "";
        setStyleGuide(guide);
      }

      const subs: Submission[] = await apiFetch(
        `/api/canvas/submissions?courseId=${courseId}&assignmentId=${currentAssignmentId}`
      );
      // Filter to supported types, take first 3
      const supported = subs
        .filter(
          (s) =>
            (s.submission_type === "online_text_entry" && s.body) ||
            hasPyAttachment(s)
        )
        .slice(0, 3);

      if (supported.length === 0) {
        setError("No supported submissions found (text entry or .py uploads).");
        setLoading(false);
        return;
      }
      setSubmissions(supported);

      // Resolve text content for each submission
      const resolvedTexts = await Promise.all(
        supported.map((s) => getSubmissionText(s))
      );

      const submissionsWithText = supported
        .map((s, i) => ({ userId: s.user_id, text: resolvedTexts[i] }))
        .filter((s): s is { userId: number; text: string } => s.text !== null);

      const result = await apiFetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          submissions: submissionsWithText,
          students: supported.map((s) => ({
            name: s.user?.name ?? "",
            userId: s.user_id,
          })),
          ...(guide ? { styleGuide: guide } : {}),
        }),
      });
      setDrafts(result.drafts);
      setStep("drafts");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate drafts");
    }
    setLoading(false);
  }

  function updateDraft(userId: number, text: string) {
    setDrafts((prev) =>
      prev.map((d) => (d.userId === userId ? { ...d, draft: text } : d))
    );
  }

  async function postDraft(d: Draft) {
    try {
      const result = await apiFetch("/api/canvas/comment", {
        method: "POST",
        body: JSON.stringify({
          courseId,
          assignmentId: currentAssignmentId,
          userId: d.userId,
          comment: d.draft,
          dryRun,
        }),
      });
      setPostResults((prev) => ({
        ...prev,
        [d.userId]: result.dryRun ? "Dry run — would post successfully" : "Posted!",
      }));
    } catch (e: unknown) {
      setPostResults((prev) => ({
        ...prev,
        [d.userId]: e instanceof Error ? e.message : "Post failed",
      }));
    }
  }

  // --- Render ---
  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* Step 1: Setup */}
      {step === "setup" && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Connect to Canvas</h2>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Canvas URL (e.g. https://school.instructure.com)"
            value={canvasUrl}
            onChange={(e) => setCanvasUrl(e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            placeholder="Canvas API Token"
            value={canvasToken}
            onChange={(e) => setCanvasToken(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={!canvasUrl || !canvasToken || loading}
            onClick={connectCanvas}
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </section>
      )}

      {/* Step 2: Select Course */}
      {step === "course" && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Select Course</h2>
          <div className="space-y-2">
            {courses.map((c) => (
              <button
                key={c.id}
                className="w-full text-left border rounded px-4 py-2 hover:bg-blue-50"
                onClick={() => selectCourse(c.id)}
              >
                {c.name} <span className="text-gray-400 text-sm">({c.course_code})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 3: Select Assignments */}
      {step === "assignments" && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Select Assignments</h2>
          <label className="block">
            <span className="text-sm font-medium">Current Assignment (to grade)</span>
            <select
              className="w-full border rounded px-3 py-2 mt-1"
              value={currentAssignmentId ?? ""}
              onChange={(e) => setCurrentAssignmentId(Number(e.target.value))}
            >
              <option value="">-- Select --</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Reference Assignment (for style)</span>
            <select
              className="w-full border rounded px-3 py-2 mt-1"
              value={refAssignmentId ?? ""}
              onChange={(e) => setRefAssignmentId(Number(e.target.value))}
            >
              <option value="">-- Select (optional) --</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={!currentAssignmentId || loading}
            onClick={generateDrafts}
          >
            {loading ? "Fetching & Generating..." : "Generate Drafts"}
          </button>
        </section>
      )}

      {/* Step 4: Review Drafts */}
      {step === "drafts" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Review Drafts</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Dry Run (no posting)
            </label>
          </div>
          {styleGuide && (
            <details className="border rounded p-3 bg-blue-50 text-sm">
              <summary className="cursor-pointer font-medium text-blue-700">
                Style Guide (from reference assignment)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-gray-600">{styleGuide}</pre>
            </details>
          )}
          {drafts.map((d) => (
            <div key={d.userId} className="border rounded p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {submissions.find((s) => s.user_id === d.userId)?.user?.name ??
                    `Student #${d.userId}`}
                  {(() => {
                    const sub = submissions.find((s) => s.user_id === d.userId);
                    const isPy = sub && hasPyAttachment(sub);
                    return (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {isPy ? ".py" : "text"}
                      </span>
                    );
                  })()}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    d.confidence === "high"
                      ? "bg-green-100 text-green-700"
                      : d.confidence === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {d.confidence} confidence
                </span>
              </div>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[100px]"
                value={d.draft}
                onChange={(e) => updateDraft(d.userId, e.target.value)}
              />
              <p className="text-xs text-gray-400">{d.reasoning}</p>
              <div className="flex items-center gap-3">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                  onClick={() => postDraft(d)}
                >
                  {dryRun ? "Preview Post" : "Post Comment"}
                </button>
                {postResults[d.userId] && (
                  <span className="text-sm text-gray-600">
                    {postResults[d.userId]}
                  </span>
                )}
              </div>
            </div>
          ))}
          <button
            className="text-sm text-blue-600 underline"
            onClick={() => setStep("assignments")}
          >
            Back to assignment selection
          </button>
        </section>
      )}
    </div>
  );
}
