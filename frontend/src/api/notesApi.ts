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