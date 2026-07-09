from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    title: Mapped[str] = mapped_column(String(120), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # normal / command / launch / gui / hybrid
    note_type: Mapped[str] = mapped_column(String(30), nullable=False, default="normal")

    # Example: C:\Users\hara_daniel\Documents\Projects\japanese-learning
    working_directory: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # cmd / powershell
    default_shell: Mapped[str] = mapped_column(String(30), nullable=False, default="cmd")

    # none / execute / launch
    run_mode: Mapped[str] = mapped_column(String(30), nullable=False, default="none")

    # Example: http://localhost:5173
    open_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    timeout_seconds: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=900,
    )

    take_screenshot_on_finish: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    console_wait_seconds: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=15,
    )

    show_console: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    close_console: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    runs: Mapped[list["NoteRun"]] = relationship(
        back_populates="note",
        cascade="all, delete-orphan",
    )

    screenshots: Mapped[list["NoteScreenshot"]] = relationship(
        back_populates="note",
        cascade="all, delete-orphan",
    )



class NoteRun(Base):
    __tablename__ = "note_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id"), nullable=False)

    status: Mapped[str] = mapped_column(String(30), nullable=False, default="running")
    run_mode: Mapped[str] = mapped_column(String(30), nullable=False)
    command: Mapped[str] = mapped_column(Text, nullable=False, default="")
    working_directory: Mapped[str | None] = mapped_column(String(500), nullable=True)

    pid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    return_code: Mapped[int | None] = mapped_column(Integer, nullable=True)

    stdout: Mapped[str] = mapped_column(Text, nullable=False, default="")
    stderr: Mapped[str] = mapped_column(Text, nullable=False, default="")

    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    note: Mapped[Note] = relationship(back_populates="runs")
    

class NoteScreenshot(Base):
    __tablename__ = "note_screenshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id"), nullable=False)

    run_id: Mapped[int | None] = mapped_column(
        ForeignKey("note_runs.id"),
        nullable=True,
    )

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    note: Mapped[Note] = relationship(back_populates="screenshots")