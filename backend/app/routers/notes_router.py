from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Note, NoteRun, NoteScreenshot
from app.schemas import (
    NoteCreate,
    NoteResponse,
    NoteRunResponse,
    NoteScreenshotResponse,
    NoteUpdate,
)
from app.services.execution_service import (
    cleanup_old_note_runs,
    execute_note,
    stop_note,
)
from app.services.screenshot_service import capture_note_screenshot

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=list[NoteResponse])
def list_notes(db: Session = Depends(get_db)) -> list[Note]:
    return db.query(Note).order_by(Note.updated_at.desc()).all()


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(payload: NoteCreate, db: Session = Depends(get_db)) -> Note:
    note = Note(**payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(note_id: int, db: Session = Depends(get_db)) -> Note:
    note = db.get(Note, note_id)

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    return note


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    payload: NoteUpdate,
    db: Session = Depends(get_db),
) -> Note:
    note = db.get(Note, note_id)

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    update_data = payload.model_dump(exclude_unset=True)

    for field_name, field_value in update_data.items():
        setattr(note, field_name, field_value)

    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)) -> dict[str, int | bool]:
    note = db.get(Note, note_id)

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    db.delete(note)
    db.commit()

    return {
        "deleted": True,
        "id": note_id,
    }


@router.post("/{note_id}/apply", response_model=NoteRunResponse)
def apply_note(note_id: int, db: Session = Depends(get_db)) -> NoteRun:
    note = db.get(Note, note_id)

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    try:
        return execute_note(db, note)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.get("/{note_id}/runs", response_model=list[NoteRunResponse])
def list_note_runs(note_id: int, db: Session = Depends(get_db)) -> list[NoteRun]:
    note = db.get(Note, note_id)

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    cleanup_old_note_runs(db, note_id)

    return (
        db.query(NoteRun)
        .filter(NoteRun.note_id == note_id)
        .order_by(NoteRun.started_at.desc())
        .all()
    )

@router.post("/{note_id}/stop", response_model=NoteRunResponse)
def stop_note_process(note_id: int, db: Session = Depends(get_db)) -> NoteRun:
    note = db.get(Note, note_id)

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    try:
        return stop_note(db, note)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    
@router.post("/{note_id}/screenshots", response_model=NoteScreenshotResponse)
def create_note_screenshot(
    note_id: int,
    db: Session = Depends(get_db),
) -> NoteScreenshot:
    note = db.get(Note, note_id)

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    try:
        return capture_note_screenshot(db, note)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Screenshot capture failed: {error}",
        ) from error


@router.get("/{note_id}/screenshots", response_model=list[NoteScreenshotResponse])
def list_note_screenshots(
    note_id: int,
    db: Session = Depends(get_db),
) -> list[NoteScreenshot]:
    note = db.get(Note, note_id)

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    return (
        db.query(NoteScreenshot)
        .filter(NoteScreenshot.note_id == note_id)
        .order_by(NoteScreenshot.created_at.desc())
        .all()
    )


@router.get("/{note_id}/screenshots/{screenshot_id}/file")
def get_note_screenshot_file(
    note_id: int,
    screenshot_id: int,
    db: Session = Depends(get_db),
) -> FileResponse:
    screenshot = (
        db.query(NoteScreenshot)
        .filter(NoteScreenshot.id == screenshot_id)
        .filter(NoteScreenshot.note_id == note_id)
        .first()
    )

    if screenshot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screenshot not found",
        )

    file_path = Path(screenshot.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screenshot file not found",
        )

    return FileResponse(
        path=file_path,
        media_type="image/png",
        filename=screenshot.file_name,
    )

@router.delete("/{note_id}/screenshots/{screenshot_id}")
def delete_note_screenshot(
    note_id: int,
    screenshot_id: int,
    db: Session = Depends(get_db),
) -> dict[str, int | bool]:
    screenshot = (
        db.query(NoteScreenshot)
        .filter(NoteScreenshot.id == screenshot_id)
        .filter(NoteScreenshot.note_id == note_id)
        .first()
    )

    if screenshot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screenshot not found",
        )

    file_path = Path(screenshot.file_path)

    db.delete(screenshot)
    db.commit()

    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        pass

    return {
        "deleted": True,
        "id": screenshot_id,
    }