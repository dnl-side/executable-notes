import type { Note } from "../types/note";

interface NoteListProps {
  notes: Note[];
  selectedNoteId: number | null;
  loading: boolean;
  onSelectNote: (noteId: number) => void;
}

export function NoteList({
  notes,
  selectedNoteId,
  loading,
  onSelectNote,
}: NoteListProps) {
  return (
    <aside className="note-list">
      <div className="note-list-header">
        <h2>ノート一覧</h2>
        {loading && <span>読み込み中...</span>}
      </div>

      {notes.length === 0 && (
        <p className="empty-message">まだノートがありません。</p>
      )}

      {notes.map((note) => (
        <button
          type="button"
          key={note.id}
          className={
            note.id === selectedNoteId ? "note-card selected" : "note-card"
          }
          onClick={() => onSelectNote(note.id)}
        >
          <strong>
            #{note.id} {note.title}
          </strong>
          <span>
            {note.note_type} / {note.run_mode}
          </span>
        </button>
      ))}
    </aside>
  );
}