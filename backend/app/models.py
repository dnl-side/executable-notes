from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

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