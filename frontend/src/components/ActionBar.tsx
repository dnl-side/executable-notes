interface ActionBarProps {
  selectedNoteId: number | null;
  loading: boolean;
  showScreenshots: boolean;
  showRuns: boolean;
  onSave: () => void;
  onApply: () => void;
  onStop: () => void;
  onLoadScreenshots: () => void;
  onLoadRuns: () => void;
  onDelete: () => void;
}

export function ActionBar({
  selectedNoteId,
  loading,
  showScreenshots,
  showRuns,
  onSave,
  onApply,
  onStop,
  onLoadScreenshots,
  onLoadRuns,
  onDelete,
}: ActionBarProps) {
  return (
    <div className="actions">
      <button type="button" onClick={onSave} disabled={loading}>
        保存
      </button>

      <button
        type="button"
        className="apply"
        onClick={onApply}
        disabled={selectedNoteId === null || loading}
      >
        適用
      </button>

      <button
        type="button"
        className="stop"
        onClick={onStop}
        disabled={selectedNoteId === null || loading}
      >
        停止
      </button>

      <button
        type="button"
        className="screenshots"
        onClick={onLoadScreenshots}
        disabled={selectedNoteId === null || loading}
      >
        {showScreenshots ? "画像非表示" : "画像確認"}
      </button>

      <button
        type="button"
        className="logs"
        onClick={onLoadRuns}
        disabled={selectedNoteId === null || loading}
      >
        {showRuns ? "ログ非表示" : "ログ確認"}
      </button>

      <button
        type="button"
        className="danger"
        onClick={onDelete}
        disabled={selectedNoteId === null || loading}
      >
        削除
      </button>
    </div>
  );
}