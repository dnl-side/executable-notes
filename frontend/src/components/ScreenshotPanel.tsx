import {
  getNoteScreenshotFileUrl,
  type NoteScreenshot,
} from "../api/notesApi";

interface ScreenshotPanelProps {
  noteId: number;
  screenshots: NoteScreenshot[];
  loading: boolean;
  onRefresh: () => void;
  onOpen: (screenshot: NoteScreenshot) => void;
  onDelete: (screenshotId: number) => void;
}

export function ScreenshotPanel({
  noteId,
  screenshots,
  loading,
  onRefresh,
  onOpen,
  onDelete,
}: ScreenshotPanelProps) {
  return (
    <section className="screenshot-panel">
      <div className="panel-header">
        <h2>スクリーンショット</h2>
        <button type="button" onClick={onRefresh} disabled={loading}>
          更新
        </button>
      </div>

      {screenshots.length === 0 && (
        <p className="empty-message">スクリーンショットがありません。</p>
      )}

      <div className="screenshot-grid">
        {screenshots.map((screenshot) => (
          <article key={screenshot.id} className="screenshot-card">
            <button
              type="button"
              className="screenshot-preview"
              onClick={() => onOpen(screenshot)}
            >
              <img
                src={getNoteScreenshotFileUrl(noteId, screenshot.id)}
                alt={screenshot.file_name}
              />
            </button>

            <div>
              <strong>{screenshot.file_name}</strong>
              <span>{new Date(screenshot.created_at).toLocaleString()}</span>
            </div>

            <div className="screenshot-actions">
              <button type="button" onClick={() => onOpen(screenshot)}>
                拡大
              </button>
              <button
                type="button"
                className="danger-small"
                onClick={() => onDelete(screenshot.id)}
                disabled={loading}
              >
                削除
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}