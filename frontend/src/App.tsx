import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { ActionBar } from "./components/ActionBar";
import { NoteList } from "./components/NoteList";
import { RunPanel } from "./components/RunPanel";
import { ScreenshotModal } from "./components/ScreenshotModal";
import { ScreenshotPanel } from "./components/ScreenshotPanel";
import {
  applyNote,
  createNote,
  deleteNote,
  deleteNoteScreenshot,
  fetchNoteRuns,
  fetchNoteScreenshots,
  fetchNotes,
  stopNote,
  updateNote,
  type NoteRun,
  type NoteScreenshot,
} from "./api/notesApi";
import type { DefaultShell, Note, NotePayload, NoteType, RunMode } from "./types/note";

const emptyForm: NotePayload = {
  title: "",
  content: "",
  note_type: "normal",
  working_directory: "",
  default_shell: "cmd",
  run_mode: "none",
  open_url: "",
};

function normalizePayload(payload: NotePayload): NotePayload {
  return {
    ...payload,
    working_directory: payload.working_directory?.trim() || null,
    open_url: payload.open_url?.trim() || null,
  };
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [form, setForm] = useState<NotePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [runs, setRuns] = useState<NoteRun[]>([]);
  const [showRuns, setShowRuns] = useState(false);
  const [screenshots, setScreenshots] = useState<NoteScreenshot[]>([]);
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<NoteScreenshot | null>(null);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  async function loadNotes() {
    setLoading(true);
    setMessage("");

    try {
      const data = await fetchNotes();
      setNotes(data);

      if (data.length > 0 && selectedNoteId === null) {
        setSelectedNoteId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      setMessage("ノート一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes();
  }, []);

    useEffect(() => {
    if (!showRuns || selectedNoteId === null) {
      return;
    }

    const hasRunningExecute = runs.some((run) => run.status === "running");

    if (!hasRunningExecute) {
      return;
    }

    const timerId = window.setInterval(async () => {
      try {
        const data = await fetchNoteRuns(selectedNoteId);
        setRuns(data);

        const stillRunning = data.some((run) => run.status === "running");

        if (!stillRunning) {
          await loadScreenshots(selectedNoteId);
        }
      } catch (error) {
        console.error(error);
      }
    }, 2000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [showRuns, selectedNoteId, runs]);

  useEffect(() => {
    setRuns([]);
    setShowRuns(false);
    setScreenshots([]);
    setShowScreenshots(false);
    setSelectedScreenshot(null);

    if (selectedNote === null) {
      setForm(emptyForm);
      return;
    }

    setForm({
      title: selectedNote.title,
      content: selectedNote.content,
      note_type: selectedNote.note_type,
      working_directory: selectedNote.working_directory ?? "",
      default_shell: selectedNote.default_shell,
      run_mode: selectedNote.run_mode,
      open_url: selectedNote.open_url ?? "",
    });
  }, [selectedNote]);

  function handleNewNote() {
    setSelectedNoteId(null);
    setForm({
      ...emptyForm,
      title: "新しいノート",
    });
    setMessage("");
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setMessage("タイトルを入力してください。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = normalizePayload(form);

      if (selectedNoteId === null) {
        const created = await createNote(payload);
        setNotes((current) => [created, ...current]);
        setSelectedNoteId(created.id);
        setMessage("ノートを作成しました。");
      } else {
        const updated = await updateNote(selectedNoteId, payload);
        setNotes((current) =>
          current.map((note) => (note.id === updated.id ? updated : note)),
        );
        setMessage("ノートを保存しました。");
      }
    } catch (error) {
      console.error(error);
      setMessage("保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (selectedNoteId === null) {
      return;
    }

    const confirmed = window.confirm("このノートを削除しますか？");

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await deleteNote(selectedNoteId);
      const nextNotes = notes.filter((note) => note.id !== selectedNoteId);
      setNotes(nextNotes);
      setSelectedNoteId(nextNotes[0]?.id ?? null);
      setMessage("ノートを削除しました。");
    } catch (error) {
      console.error(error);
      setMessage("削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof NotePayload>(
    key: K,
    value: NotePayload[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleApply() {
    if (selectedNoteId === null) {
      setMessage("実行するノートを選択してください。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const run = await applyNote(selectedNoteId);
      setMessage(`実行しました。status=${run.status}, pid=${run.pid ?? "-"}`);

      const data = await fetchNoteRuns(selectedNoteId);
      setRuns(data);
      setShowRuns(true);
    } catch (error) {
      console.error(error);
      setMessage("実行に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadRuns() {
    if (selectedNoteId === null) {
      setMessage("ログを確認するノートを選択してください。");
      return;
    }

    if (showRuns) {
      setShowRuns(false);
      setMessage("ログを非表示にしました。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await fetchNoteRuns(selectedNoteId);
      setRuns(data);
      setShowRuns(true);
      setMessage("ログを取得しました。");
    } catch (error) {
      console.error(error);
      setMessage("ログの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    if (selectedNoteId === null) {
      setMessage("停止するノートを選択してください。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const run = await stopNote(selectedNoteId);
      setMessage(`停止しました。status=${run.status}, pid=${run.pid ?? "-"}`);

      const data = await fetchNoteRuns(selectedNoteId);
      setRuns(data);
      setShowRuns(true);
    } catch (error) {
      console.error(error);
      setMessage("停止に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function loadScreenshots(noteId: number) {
    const data = await fetchNoteScreenshots(noteId);
    setScreenshots(data);
    return data;
  }

  async function handleLoadScreenshots() {
    if (selectedNoteId === null) {
      setMessage("スクリーンショットを確認するノートを選択してください。");
      return;
    }

    if (showScreenshots) {
      setShowScreenshots(false);
      setSelectedScreenshot(null);
      setMessage("スクリーンショットを非表示にしました。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await loadScreenshots(selectedNoteId);
      setShowScreenshots(true);

      if (data.length === 0) {
        setMessage(`ノート #${selectedNoteId} のスクリーンショットはありません。`);
      } else {
        setMessage(`スクリーンショットを取得しました。${data.length}件`);
      }
    } catch (error) {
      console.error(error);
      setMessage("スクリーンショットの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteScreenshot(screenshotId: number) {
    if (selectedNoteId === null) {
      return;
    }

    const confirmed = window.confirm("このスクリーンショットを削除しますか？");

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await deleteNoteScreenshot(selectedNoteId, screenshotId);
      const data = await loadScreenshots(selectedNoteId);

      if (selectedScreenshot?.id === screenshotId) {
        setSelectedScreenshot(null);
      }

      if (data.length === 0) {
        setShowScreenshots(false);
      }

      setMessage("スクリーンショットを削除しました。");
    } catch (error) {
      console.error(error);
      setMessage("スクリーンショットの削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>実行ノート</h1>
          <p>ノートからローカル作業を起動・管理するためのツールです。</p>
        </div>
        <button type="button" onClick={handleNewNote}>
          新規ノート
        </button>
      </header>

      <section className="app-layout">
        <NoteList
          notes={notes}
          selectedNoteId={selectedNoteId}
          loading={loading}
          onSelectNote={setSelectedNoteId}
        />

        <section className="editor-panel">
          <div className="form-row">
            <label htmlFor="title">タイトル</label>
            <input
              id="title"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
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
                  updateForm("note_type", event.target.value as NoteType)
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
                  updateForm("run_mode", event.target.value as RunMode)
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
                  updateForm("default_shell", event.target.value as DefaultShell)
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
              onChange={(event) =>
                updateForm("working_directory", event.target.value)
              }
              placeholder="C:\work\"
            />
          </div>

          <div className="form-row">
            <label htmlFor="openUrl">起動後に開くURL</label>
            <input
              id="openUrl"
              value={form.open_url ?? ""}
              onChange={(event) => updateForm("open_url", event.target.value)}
              placeholder="http://localhost:5173"
            />
          </div>

          <div className="form-row">
            <label htmlFor="content">本文 / コマンド</label>
            <textarea
              id="content"
              value={form.content}
              onChange={(event) => updateForm("content", event.target.value)}
              placeholder="npm run dev"
              rows={12}
            />
          </div>

          <ActionBar
            selectedNoteId={selectedNoteId}
            loading={loading}
            showScreenshots={showScreenshots}
            showRuns={showRuns}
            onSave={handleSave}
            onApply={handleApply}
            onStop={handleStop}
            onLoadScreenshots={handleLoadScreenshots}
            onLoadRuns={handleLoadRuns}
            onDelete={handleDelete}
          />

          {message && <p className="status-message">{message}</p>}
          
          {showScreenshots && selectedNoteId !== null && (
            <ScreenshotPanel
              noteId={selectedNoteId}
              screenshots={screenshots}
              loading={loading}
              onRefresh={() => void loadScreenshots(selectedNoteId)}
              onOpen={setSelectedScreenshot}
              onDelete={(screenshotId) => void handleDeleteScreenshot(screenshotId)}
            />
          )}
          {selectedScreenshot !== null && selectedNoteId !== null && (
            <ScreenshotModal
              noteId={selectedNoteId}
              screenshot={selectedScreenshot}
              loading={loading}
              onClose={() => setSelectedScreenshot(null)}
              onDelete={(screenshotId) => void handleDeleteScreenshot(screenshotId)}
            />
          )}

          {showRuns && <RunPanel runs={runs} />}

        </section>
      </section>
    </main>
  );
}

export default App;