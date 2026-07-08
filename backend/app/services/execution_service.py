from datetime import datetime
from pathlib import Path
import subprocess
import tempfile
import time

from urllib.error import URLError
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from app.models import Note, NoteRun


def _validate_working_directory(working_directory: str | None) -> Path:
    if not working_directory:
        raise ValueError("作業フォルダが設定されていません。")

    path = Path(working_directory)

    if not path.exists():
        raise ValueError(f"作業フォルダが存在しません: {working_directory}")

    if not path.is_dir():
        raise ValueError(f"作業フォルダがフォルダではありません: {working_directory}")

    return path


def _build_cmd_bat(working_directory: Path, commands: list[str]) -> str:
    lines = [
        "@echo off",
        f'cd /d "{working_directory}"',
    ]

    for command in commands:
        lines.append(command)
        lines.append("if errorlevel 1 exit /b %errorlevel%")

    return "\n".join(lines) + "\n"


def _open_edge(url: str) -> None:
    subprocess.Popen(
        ["cmd.exe", "/c", "start", "", "msedge", url],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

def _wait_for_url(url: str, timeout_seconds: int = 60) -> bool:
    deadline = time.monotonic() + timeout_seconds

    while time.monotonic() < deadline:
        try:
            request = Request(
                url,
                headers={"User-Agent": "ExecutableNotes/0.1"},
            )

            with urlopen(request, timeout=2) as response:
                if 200 <= response.status < 500:
                    return True

        except URLError:
            pass
        except TimeoutError:
            pass
        except OSError:
            pass

        time.sleep(1)

    return False


def execute_note(db: Session, note: Note) -> NoteRun:
    if note.run_mode == "none":
        raise ValueError("このノートは実行モードが設定されていません。")

    if note.default_shell != "cmd":
        raise ValueError("現在はcmdのみ対応しています。")

    commands = [
        line.strip()
        for line in note.content.splitlines()
        if line.strip()
    ]

    if not commands:
        raise ValueError("実行するコマンドがありません。")

    working_directory = _validate_working_directory(note.working_directory)

    run = NoteRun(
        note_id=note.id,
        status="running",
        run_mode=note.run_mode,
        command="\n".join(commands),
        working_directory=str(working_directory),
    )

    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        if note.run_mode == "execute":
            _run_execute_mode(db, run, working_directory, commands)
        elif note.run_mode == "launch":
            _run_launch_mode(db, run, working_directory, commands, note.open_url)
        else:
            raise ValueError(f"未対応の実行モードです: {note.run_mode}")

    except Exception as error:
        run.status = "failed"
        run.stderr = str(error)
        run.finished_at = datetime.utcnow()
        db.commit()
        db.refresh(run)

    return run


def _run_execute_mode(
    db: Session,
    run: NoteRun,
    working_directory: Path,
    commands: list[str],
) -> None:
    bat_content = _build_cmd_bat(working_directory, commands)

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".bat",
        delete=False,
        encoding="utf-8",
    ) as file:
        file.write(bat_content)
        bat_path = file.name

    result = subprocess.run(
        ["cmd.exe", "/c", bat_path],
        capture_output=True,
        text=True,
        timeout=300,
    )

    run.return_code = result.returncode
    run.stdout = result.stdout
    run.stderr = result.stderr
    run.status = "success" if result.returncode == 0 else "failed"
    run.finished_at = datetime.utcnow()

    db.commit()
    db.refresh(run)


def _run_launch_mode(
    db: Session,
    run: NoteRun,
    working_directory: Path,
    commands: list[str],
    open_url: str | None,
) -> None:
    command_text = " && ".join(commands)

    process = subprocess.Popen(
        ["cmd.exe", "/k", command_text],
        cwd=str(working_directory),
        creationflags=subprocess.CREATE_NEW_CONSOLE,
    )

    run.pid = process.pid
    run.status = "launched"
    db.commit()
    db.refresh(run)

    if open_url:
        is_ready = _wait_for_url(open_url, timeout_seconds=60)

        if is_ready:
            _open_edge(open_url)
        else:
            run.stderr = (
                run.stderr
                + f"\nURLの起動待機がタイムアウトしました: {open_url}"
            )
            db.commit()

def _is_process_running(pid: int) -> bool:
    result = subprocess.run(
        ["tasklist", "/FI", f"PID eq {pid}"],
        capture_output=True,
        text=True,
    )

    return str(pid) in result.stdout            

def stop_note(db: Session, note: Note) -> NoteRun:
    run = (
        db.query(NoteRun)
        .filter(NoteRun.note_id == note.id)
        .filter(NoteRun.status.in_(["launched", "running"]))
        .filter(NoteRun.pid.isnot(None))
        .order_by(NoteRun.started_at.desc())
        .first()
    )

    if run is None:
        raise ValueError("停止対象の実行中プロセスがありません。")

    result = subprocess.run(
        ["taskkill", "/PID", str(run.pid), "/T", "/F"],
        capture_output=True,
        text=True,
    )

    time.sleep(1)

    process_still_running = _is_process_running(run.pid)
    stdout_upper = result.stdout.upper()

    taskkill_success = (
        result.returncode == 0
        or "SUCCESS:" in stdout_upper
        or "成功" in result.stdout
        or not process_still_running
    )

    run.return_code = result.returncode
    run.stdout = (run.stdout or "") + result.stdout
    run.stderr = (run.stderr or "") + result.stderr
    run.status = "stopped" if taskkill_success else "failed"
    run.finished_at = datetime.utcnow()

    db.commit()
    db.refresh(run)

    return run