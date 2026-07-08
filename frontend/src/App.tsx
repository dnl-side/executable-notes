import "./App.css";
import { ActionBar } from "./components/ActionBar";
import { NoteEditor } from "./components/NoteEditor";
import { NoteList } from "./components/NoteList";
import { RunPanel } from "./components/RunPanel";
import { ScreenshotModal } from "./components/ScreenshotModal";
import { ScreenshotPanel } from "./components/ScreenshotPanel";
import { useExecutableNotes } from "./hooks/useExecutableNotes";

function App() {
  const notesState = useExecutableNotes();

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>実行ノート</h1>
          <p>ノートからローカル作業を起動・管理するためのツールです。</p>
        </div>
        <button type="button" onClick={notesState.handleNewNote}>
          新規ノート
        </button>
      </header>

      <section className="app-layout">
        <NoteList
          notes={notesState.notes}
          selectedNoteId={notesState.selectedNoteId}
          loading={notesState.loading}
          onSelectNote={notesState.setSelectedNoteId}
        />

        <section className="editor-panel">
          <NoteEditor
            form={notesState.form}
            onUpdate={notesState.updateForm}
          />

          <ActionBar
            selectedNoteId={notesState.selectedNoteId}
            loading={notesState.loading}
            showScreenshots={notesState.showScreenshots}
            showRuns={notesState.showRuns}
            onSave={notesState.handleSave}
            onApply={notesState.handleApply}
            onStop={notesState.handleStop}
            onLoadScreenshots={notesState.handleLoadScreenshots}
            onLoadRuns={notesState.handleLoadRuns}
            onDelete={notesState.handleDelete}
          />

          {notesState.message && (
            <p className="status-message">{notesState.message}</p>
          )}

          {notesState.showScreenshots && notesState.selectedNoteId !== null && (
            <ScreenshotPanel
              noteId={notesState.selectedNoteId}
              screenshots={notesState.screenshots}
              loading={notesState.loading}
              onRefresh={() => void notesState.loadScreenshots(notesState.selectedNoteId!)}
              onOpen={notesState.setSelectedScreenshot}
              onDelete={(screenshotId) =>
                void notesState.handleDeleteScreenshot(screenshotId)
              }
            />
          )}

          {notesState.selectedScreenshot !== null &&
            notesState.selectedNoteId !== null && (
              <ScreenshotModal
                noteId={notesState.selectedNoteId}
                screenshot={notesState.selectedScreenshot}
                loading={notesState.loading}
                onClose={() => notesState.setSelectedScreenshot(null)}
                onDelete={(screenshotId) =>
                  void notesState.handleDeleteScreenshot(screenshotId)
                }
              />
            )}

          {notesState.showRuns && <RunPanel runs={notesState.runs} />}
        </section>
      </section>
    </main>
  );
}

export default App;