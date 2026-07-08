import type { NoteRun } from "../api/notesApi";

interface RunPanelProps {
  runs: NoteRun[];
}

export function RunPanel({ runs }: RunPanelProps) {
  return (
    <section className="run-panel">
      <h2>実行ログ</h2>

      {runs.length === 0 && (
        <p className="empty-message">実行履歴がありません。</p>
      )}

      {runs.map((run) => (
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
      ))}
    </section>
  );
}