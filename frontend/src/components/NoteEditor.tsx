import type {
  DefaultShell,
  NotePayload,
  NoteType,
  RunMode,
} from "../types/note";

interface NoteEditorProps {
  form: NotePayload;
  onUpdate: <K extends keyof NotePayload>(
    key: K,
    value: NotePayload[K],
  ) => void;
}

export function NoteEditor({ form, onUpdate }: NoteEditorProps) {
  return (
    <>
      <div className="form-row">
        <label htmlFor="title">タイトル</label>
        <input
          id="title"
          value={form.title}
          onChange={(event) => onUpdate("title", event.target.value)}
          placeholder="例: APP 起動"
        />
      </div>

      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="noteType">ノート種別</label>
          <select
            id="noteType"
            value={form.note_type}
            onChange={(event) =>
              onUpdate("note_type", event.target.value as NoteType)
            }
          >
            <option value="normal">通常ノート</option>
            <option value="command">コマンド実行ノート</option>
            <option value="launch">開発サーバー起動ノート</option>
            <option value="gui">GUI操作ノート</option>
            <option value="hybrid">複合ノート</option>
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="runMode">実行モード</label>
          <select
            id="runMode"
            value={form.run_mode}
            onChange={(event) =>
              onUpdate("run_mode", event.target.value as RunMode)
            }
          >
            <option value="none">実行なし</option>
            <option value="execute">実行して終了を待つ</option>
            <option value="launch">起動して保持する</option>
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="shell">シェル</label>
          <select
            id="shell"
            value={form.default_shell}
            onChange={(event) =>
              onUpdate("default_shell", event.target.value as DefaultShell)
            }
          >
            <option value="cmd">cmd</option>
            <option value="powershell">PowerShell</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="workingDirectory">作業フォルダ</label>
        <input
          id="workingDirectory"
          value={form.working_directory ?? ""}
          onChange={(event) => onUpdate("working_directory", event.target.value)}
          placeholder="C:\work\"
        />
      </div>

      <div className="form-row">
        <label htmlFor="openUrl">起動後に開くURL</label>
        <input
          id="openUrl"
          value={form.open_url ?? ""}
          onChange={(event) => onUpdate("open_url", event.target.value)}
          placeholder="http://localhost:5173"
        />
      </div>

      <div className="form-row">
        <label htmlFor="content">本文 / コマンド</label>
        <textarea
          id="content"
          value={form.content}
          onChange={(event) => onUpdate("content", event.target.value)}
          placeholder="npm run dev"
          rows={12}
        />
      </div>
    </>
  );
}