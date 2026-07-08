import {
  getNoteScreenshotFileUrl,
  type NoteRun,
  type NoteScreenshot,
} from "../api/notesApi";

interface RunPanelProps {
  noteId: number;
  runs: NoteRun[];
  screenshots: NoteScreenshot[];
  onOpenScreenshot: (screenshot: NoteScreenshot) => void;
}

export function RunPanel({
  noteId,
  runs,
  screenshots,
  onOpenScreenshot,
}: RunPanelProps) {
  return (
    <section className="run-panel">
      <h2>実行ログ</h2>

      {runs.length === 0 && (
        <p className="empty-message">実行履歴がありません。</p>
      )}

      {runs.map((run) => {
        const runScreenshots = screenshots.filter(
          (screenshot) => screenshot.run_id === run.id,
        );

        return (
          <article key={run.id} className="run-card">
            <div className="run-card-header">
              <strong>
                #{run.id} / {run.status}
              </strong>
              <span>{new Date(run.started_at).toLocaleString()}</span>
            </div>

            <dl className="run-meta">
              <div>
                <dt>mode</dt>
                <dd>{run.run_mode}</dd>
              </div>
              <div>
                <dt>pid</dt>
                <dd>{run.pid ?? "-"}</dd>
              </div>
              <div>
                <dt>return</dt>
                <dd>{run.return_code ?? "-"}</dd>
              </div>
              <div>
                <dt>finished</dt>
                <dd>
                  {run.finished_at
                    ? new Date(run.finished_at).toLocaleString()
                    : "-"}
                </dd>
              </div>
            </dl>

            {runScreenshots.length > 0 && (
              <div className="run-evidence">
                <strong>evidence</strong>
                <div className="run-evidence-grid">
                  {runScreenshots.map((screenshot) => (
                    <button
                      key={screenshot.id}
                      type="button"
                      className="run-evidence-shot"
                      onClick={() => onOpenScreenshot(screenshot)}
                    >
                      <img
                        src={getNoteScreenshotFileUrl(noteId, screenshot.id)}
                        alt={screenshot.file_name}
                      />
                      <span>{screenshot.file_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="run-command">
              <strong>command</strong>
              <pre>{run.command}</pre>
            </div>

            {run.working_directory && (
              <div className="run-command">
                <strong>working directory</strong>
                <pre>{run.working_directory}</pre>
              </div>
            )}

            {run.stdout && (
              <details open>
                <summary>stdout</summary>
                <pre>{run.stdout}</pre>
              </details>
            )}

            {run.stderr && (
              <details open>
                <summary>stderr</summary>
                <pre>{run.stderr}</pre>
              </details>
            )}
          </article>
        );
      })}
    </section>
  );
}