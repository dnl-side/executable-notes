from datetime import datetime
from pathlib import Path
import time

import pyautogui
import pygetwindow as gw
from sqlalchemy.orm import Session

from app.models import Note, NoteScreenshot

BACKEND_ROOT = Path(__file__).resolve().parents[2]
SCREENSHOT_DIR = BACKEND_ROOT / "storage" / "screenshots"


def _build_screenshot_file_name(note_id: int, prefix: str = "note") -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{note_id}_{timestamp}.png"


def _save_screenshot_record(
    db: Session,
    note_id: int,
    file_name: str,
    file_path: Path,
    run_id: int | None = None,
) -> NoteScreenshot:
    screenshot = NoteScreenshot(
        note_id=note_id,
        run_id=run_id,
        file_name=file_name,
        file_path=str(file_path),
    )

    db.add(screenshot)
    db.commit()
    db.refresh(screenshot)

    return screenshot


def capture_note_screenshot(db: Session, note: Note) -> NoteScreenshot:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    file_name = _build_screenshot_file_name(note.id, prefix="note")
    file_path = SCREENSHOT_DIR / file_name

    image = pyautogui.screenshot()
    image.save(file_path)

    return _save_screenshot_record(db, note.id, file_name, file_path)


def capture_window_screenshot_by_title(
    db: Session,
    note_id: int,
    window_title: str,
    prefix: str,
    run_id: int | None = None,
) -> NoteScreenshot | None:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    windows = gw.getWindowsWithTitle(window_title)

    if not windows:
        all_windows = gw.getAllWindows()
        windows = [
            window
            for window in all_windows
            if window_title.lower() in (window.title or "").lower()
        ]

    if not windows:
        return None

    window = windows[0]

    if window.isMinimized:
        window.restore()
        time.sleep(0.5)

    try:
        window.activate()
        time.sleep(0.5)
    except Exception:
        pass

    left = max(int(window.left), 0)
    top = max(int(window.top), 0)
    width = max(int(window.width), 1)
    height = max(int(window.height), 1)

    file_name = _build_screenshot_file_name(note_id, prefix=prefix)
    file_path = SCREENSHOT_DIR / file_name

    image = pyautogui.screenshot(region=(left, top, width, height))
    image.save(file_path)

    return _save_screenshot_record(
        db=db,
        note_id=note_id,
        file_name=file_name,
        file_path=file_path,
        run_id=run_id,
    )