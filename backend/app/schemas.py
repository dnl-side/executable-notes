from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


NoteType = Literal["normal", "command", "launch", "gui", "hybrid"]
DefaultShell = Literal["cmd", "powershell"]
RunMode = Literal["none", "execute", "launch"]


class NoteBase(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    content: str = ""

    note_type: NoteType = "normal"
    working_directory: str | None = None
    default_shell: DefaultShell = "cmd"
    run_mode: RunMode = "none"
    open_url: str | None = None


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    content: str | None = None

    note_type: NoteType | None = None
    working_directory: str | None = None
    default_shell: DefaultShell | None = None
    run_mode: RunMode | None = None
    open_url: str | None = None


class NoteResponse(NoteBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)