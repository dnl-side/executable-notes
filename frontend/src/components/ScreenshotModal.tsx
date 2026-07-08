import {
  getNoteScreenshotFileUrl,
  type NoteScreenshot,
} from "../api/notesApi";

interface ScreenshotModalProps {
  noteId: number;
  screenshot: NoteScreenshot;
  loading: boolean;
  onClose: () => void;
  onDelete: (screenshotId: number) => void;
}

export function ScreenshotModal({
  noteId,
  screenshot,
  loading,
  onClose,
  onDelete,
}: ScreenshotModalProps) {
  return (
    <div
      className="screenshot-modal"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="screenshot-modal-content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="screenshot-modal-header">
          <strong>{screenshot.file_name}</strong>
          <button type="button" onClick={onClose}>
            閉じる
          </button>
        </div>

        <img
          src={getNoteScreenshotFileUrl(noteId, screenshot.id)}
          alt={screenshot.file_name}
        />

        <div className="screenshot-modal-actions">
          <button
            type="button"
            className="danger-small"
            onClick={() => onDelete(screenshot.id)}
            disabled={loading}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}