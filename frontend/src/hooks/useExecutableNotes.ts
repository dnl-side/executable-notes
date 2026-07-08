import { useEffect, useMemo, useState } from "react";
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
} from "../api/notesApi";
import type { Note, NotePayload } from "../types/note";
import {
  createNewNotePayload,
  emptyForm,
  normalizePayload,
  noteToPayload,
} from "../utils/noteForm";

export function useExecutableNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [form, setForm] = useState<NotePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [runs, setRuns] = useState<NoteRun[]>([]);
  const [showRuns, setShowRuns] = useState(false);

  const [screenshots, setScreenshots] = useState<NoteScreenshot[]>([]);
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] =
    useState<NoteScreenshot | null>(null);

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

    setForm(noteToPayload(selectedNote));
  }, [selectedNote]);

  function handleNewNote() {
    setSelectedNoteId(null);
    setForm(createNewNotePayload());
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

  return {
    notes,
    selectedNoteId,
    setSelectedNoteId,
    form,
    loading,
    message,
    runs,
    showRuns,
    screenshots,
    showScreenshots,
    selectedScreenshot,
    setSelectedScreenshot,
    handleNewNote,
    handleSave,
    handleDelete,
    updateForm,
    handleApply,
    handleLoadRuns,
    handleStop,
    loadScreenshots,
    handleLoadScreenshots,
    handleDeleteScreenshot,
  };
}