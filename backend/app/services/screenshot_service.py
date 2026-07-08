from datetime import datetime
from pathlib import Path

import pyautogui
from sqlalchemy.orm import Session

from app.models import Note, NoteScreenshot

BACKEND_ROOT = Path(__file__).resolve().parents[2]
SCREENSHOT_DIR = BACKEND_ROOT / "storage" / "screenshots"


def capture_note_screenshot(db: Session, note: Note) -> NoteScreenshot:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"note_{note.id}_{timestamp}.png"
    file_path = SCREENSHOT_DIR / file_name

    image = pyautogui.screenshot()
    image.save(file_path)

    screenshot = NoteScreenshot(
        note_id=note.id,
        file_name=file_name,
        file_path=str(file_path),
    )

    db.add(screenshot)
    db.commit()
    db.refresh(screenshot)

    return screenshot