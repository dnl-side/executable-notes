import type { Note, NotePayload } from "../types/note";

const API_BASE_URL = "http://127.0.0.1:8000/api";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "API request failed");
  }

  return response.json() as Promise<T>;
}

export async function fetchNotes(): Promise<Note[]> {
  return request<Note[]>("/notes");
}

export async function createNote(payload: NotePayload): Promise<Note> {
  return request<Note>("/notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateNote(
  noteId: number,
  payload: Partial<NotePayload>,
): Promise<Note> {
  return request<Note>(`/notes/${noteId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteNote(noteId: number): Promise<void> {
  await fetch(`${API_BASE_URL}/notes/${noteId}`, {
    method: "DELETE",
  });
}

export interface NoteRun {
  id: number;
  note_id: number;
  status: string;
  run_mode: string;
  command: string;
  working_directory: string | null;
  pid: number | null;
  return_code: number | null;
  stdout: string;
  stderr: string;
  started_at: string;
  finished_at: string | null;
}

export async function applyNote(noteId: number): Promise<NoteRun> {
  return request<NoteRun>(`/notes/${noteId}/apply`, {
    method: "POST",
  });
}

export async function fetchNoteRuns(noteId: number): Promise<NoteRun[]> {
  return request<NoteRun[]>(`/notes/${noteId}/runs`);
}

export async function stopNote(noteId: number): Promise<NoteRun> {
  return request<NoteRun>(`/notes/${noteId}/stop`, {
    method: "POST",
  });
}
export interface NoteScreenshot {
  id: number;
  note_id: number;
  file_name: string;
  file_path: string;
  created_at: string;
}

export async function captureNoteScreenshot(
  noteId: number,
): Promise<NoteScreenshot> {
  return request<NoteScreenshot>(`/notes/${noteId}/screenshots`, {
    method: "POST",
  });
}

export async function fetchNoteScreenshots(
  noteId: number,
): Promise<NoteScreenshot[]> {
  return request<NoteScreenshot[]>(`/notes/${noteId}/screenshots`);
}

export function getNoteScreenshotFileUrl(
  noteId: number,
  screenshotId: number,
): string {
  return `${API_BASE_URL}/notes/${noteId}/screenshots/${screenshotId}/file`;
}