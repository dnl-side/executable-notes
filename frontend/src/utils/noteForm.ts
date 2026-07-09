import type { Note, NotePayload } from "../types/note";

export const emptyForm: NotePayload = {
  title: "",
  content: "",
  note_type: "normal",
  working_directory: "",
  default_shell: "cmd",
  run_mode: "none",
  open_url: "",
  timeout_seconds: 900,
  take_screenshot_on_finish: true,
  console_wait_seconds: 15,
  show_console: true,
  close_console: true,
};

export function normalizePayload(payload: NotePayload): NotePayload {
  return {
    ...payload,
    working_directory: payload.working_directory?.trim() || null,
    open_url: payload.open_url?.trim() || null,
  };
}

export function noteToPayload(note: Note): NotePayload {
  return {
    title: note.title,
    content: note.content,
    note_type: note.note_type,
    working_directory: note.working_directory ?? "",
    default_shell: note.default_shell,
    run_mode: note.run_mode,
    open_url: note.open_url ?? "",
    timeout_seconds: note.timeout_seconds ?? 900,
    take_screenshot_on_finish: note.take_screenshot_on_finish ?? true,
    console_wait_seconds: note.console_wait_seconds ?? 15,
    show_console: note.show_console ?? true,
    close_console: note.close_console ?? true,
  };
}

export function createNewNotePayload(): NotePayload {
  return {
    ...emptyForm,
    title: "新しいノート",
  };
}