export type NoteType = "normal" | "command" | "launch" | "gui" | "hybrid";

export type DefaultShell = "cmd" | "powershell";

export type RunMode = "none" | "execute" | "launch";

export interface Note {
  id: number;
  title: string;
  content: string;
  note_type: NoteType;
  working_directory: string | null;
  default_shell: DefaultShell;
  run_mode: RunMode;
  open_url: string | null;
  timeout_seconds: number;
  take_screenshot_on_finish: boolean;
  console_wait_seconds: number;
  show_console: boolean;
  close_console: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotePayload {
  title: string;
  content: string;
  note_type: NoteType;
  working_directory: string | null;
  default_shell: DefaultShell;
  run_mode: RunMode;
  open_url: string | null;
  timeout_seconds: number;
  take_screenshot_on_finish: boolean;
  console_wait_seconds: number;
  show_console: boolean;
  close_console: boolean;
}