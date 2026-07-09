from datetime import datetime
from pathlib import Path
import subprocess
import tempfile
import time
import threading

from urllib.error import URLError
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Note, NoteRun, NoteScreenshot
from app.services.screenshot_service import capture_window_screenshot_by_title

BACKEND_ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = BACKEND_ROOT / "storage" / "logs"
RUN_LOG_RETENTION_COUNT = 5

def _validate_working_directory(working_directory: str | None) -> Path:
    if not working_directory:
        raise ValueError("作業フォルダが設定されていません。")

    path = Path(working_directory)

    if not path.exists():
        raise ValueError(f"作業フォルダが存在しません: {working_directory}")

    if not path.is_dir():
        raise ValueError(f"作業フォルダがフォルダではありません: {working_directory}")

    return path

def _normalize_batch_command(command: str) -> str:
    stripped_command = command.strip()
    lower_command = stripped_command.lower()

    if lower_command.startswith("call "):
        return stripped_command

    first_token = stripped_command.split()[0].strip('"').lower()

    if first_token.endswith(".bat") or first_token.endswith(".cmd"):
        return f"call {stripped_command}"

    return stripped_command


def _ps_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"

def _build_cmd_bat(working_directory: Path, commands: list[str]) -> str:
    lines = [
        "@echo off",
        "chcp 65001 >nul",
        f'cd /d "{working_directory}"',
    ]

    for command in commands:
        normalized_command = _normalize_batch_command(command)
        lines.append(normalized_command)
        lines.append("if errorlevel 1 exit /b %errorlevel%")

    return "\n".join(lines) + "\n"


def _open_edge(url: str) -> None:
    subprocess.Popen(
        ["cmd.exe", "/c", "start", "", "msedge", url],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

def cleanup_old_note_runs(
    db: Session,
    note_id: int,
    keep_count: int = RUN_LOG_RETENTION_COUNT,
) -> None:
    all_runs = (
        db.query(NoteRun)
        .filter(NoteRun.note_id == note_id)
        .order_by(NoteRun.started_at.desc())
        .all()
    )

    runs_to_delete = all_runs[keep_count:]

    for old_run in runs_to_delete:
        if old_run.status == "running":
            continue

        screenshots = (
            db.query(NoteScreenshot)
            .filter(NoteScreenshot.run_id == old_run.id)
            .all()
        )

        for screenshot in screenshots:
            try:
                Path(screenshot.file_path).unlink(missing_ok=True)
            except OSError:
                pass

            db.delete(screenshot)

        for log_path in [
            LOG_DIR / f"note_run_{old_run.id}.log",
            LOG_DIR / f"note_run_{old_run.id}.done",
        ]:
            try:
                log_path.unlink(missing_ok=True)
            except OSError:
                pass

        db.delete(old_run)

    if runs_to_delete:
        db.commit()

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

    cleanup_old_note_runs(db, note.id)

    try:
        if note.run_mode == "execute":
            _run_execute_mode(db, run, note, working_directory, commands)
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
    note: Note,
    working_directory: Path,
    commands: list[str],
) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    timeout_seconds = max(int(note.timeout_seconds or 900), 1)
    console_wait_seconds = max(int(note.console_wait_seconds or 0), 0)

    if not note.show_console:
        _run_execute_mode_hidden(
            db=db,
            run=run,
            working_directory=working_directory,
            commands=commands,
            timeout_seconds=timeout_seconds,
        )
        return

    bat_content = _build_cmd_bat(working_directory, commands)

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".bat",
        delete=False,
        encoding="utf-8-sig",
    ) as file:
        file.write(bat_content)
        bat_path = file.name

    log_path = LOG_DIR / f"note_run_{run.id}.log"
    marker_path = LOG_DIR / f"note_run_{run.id}.done"
    window_title = f"ExecutableNotes-Run-{run.id}"

    after_finish_lines: list[str] = [
        "$exitCode | Set-Content -Path $markerPath -Encoding UTF8",
    ]

    if note.take_screenshot_on_finish:
        after_finish_lines.append(
            'Write-Host "[Executable Notes] Waiting for screenshot capture..."'
        )

    if note.close_console:
        after_finish_lines.append(f"Start-Sleep -Seconds {console_wait_seconds}")
        after_finish_lines.append("exit $exitCode")
    else:
        after_finish_lines.append(
            'Write-Host "[Executable Notes] Interactive console is ready."'
        )
        after_finish_lines.append(
            'Write-Host "[Executable Notes] Type exit to close this console."'
        )
        after_finish_lines.append("cmd.exe /k")
        after_finish_lines.append("exit $exitCode")

    ps_script = "\n".join(
        [
            "$ErrorActionPreference = 'Continue'",
            "$OutputEncoding = [System.Text.Encoding]::UTF8",
            "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
            f"[Console]::Title = {_ps_quote(window_title)}",
            "chcp 65001 > $null",
            f"$batPath = {_ps_quote(bat_path)}",
            f"$logPath = {_ps_quote(str(log_path))}",
            f"$markerPath = {_ps_quote(str(marker_path))}",
            "New-Item -ItemType Directory -Force -Path (Split-Path $logPath) | Out-Null",
            "if (Test-Path $logPath) { Remove-Item $logPath -Force }",
            "if (Test-Path $markerPath) { Remove-Item $markerPath -Force }",
            'Write-Host "[Executable Notes] Starting execution..."',
            'Write-Host "[Executable Notes] BAT: $batPath"',
            'Write-Host "[Executable Notes] LOG: $logPath"',
            '& cmd.exe /c $batPath 2>&1 | ForEach-Object {',
            '    $line = $_.ToString()',
            '    Write-Host $line',
            '    Add-Content -Path $logPath -Value $line -Encoding UTF8',
            '}',
            "$exitCode = $LASTEXITCODE",
            'Write-Host ""',
            'Write-Host "[Executable Notes] Execution finished. ExitCode=$exitCode"',
            f"[Console]::Title = {_ps_quote(window_title)}",
            f"cmd.exe /c title {window_title}",
            *after_finish_lines,
        ]
    )

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".ps1",
        delete=False,
        encoding="utf-8-sig",
    ) as file:
        file.write(ps_script)
        ps1_path = file.name

    process = subprocess.Popen(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            ps1_path,
        ],
        cwd=str(working_directory),
        creationflags=subprocess.CREATE_NEW_CONSOLE,
    )

    run.pid = process.pid
    run.status = "running"
    run.stdout = ""
    run.stderr = ""
    db.commit()
    db.refresh(run)

    watcher = threading.Thread(
        target=_watch_visible_execute_process,
        args=(
            run.id,
            run.note_id,
            process,
            log_path,
            marker_path,
            bat_path,
            ps1_path,
            window_title,
            timeout_seconds,
            note.take_screenshot_on_finish,
            note.close_console,
        ),
        daemon=True,
    )
    watcher.start()

def _run_execute_mode_hidden(
    db: Session,
    run: NoteRun,
    working_directory: Path,
    commands: list[str],
    timeout_seconds: int,
) -> None:
    bat_content = _build_cmd_bat(working_directory, commands)

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".bat",
        delete=False,
        encoding="utf-8-sig",
    ) as file:
        file.write(bat_content)
        bat_path = file.name

    try:
        result = subprocess.run(
            ["cmd.exe", "/c", bat_path],
            cwd=str(working_directory),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )

        run.pid = None
        run.return_code = result.returncode
        run.stdout = result.stdout or ""
        run.stderr = result.stderr or ""
        run.status = "success" if result.returncode == 0 else "failed"
        run.finished_at = datetime.utcnow()

    except subprocess.TimeoutExpired as error:
        run.pid = None
        run.return_code = None
        run.status = "failed"
        run.stdout = error.stdout if isinstance(error.stdout, str) else ""
        run.stderr = error.stderr if isinstance(error.stderr, str) else ""
        run.stderr += f"\nTimeout: {timeout_seconds} seconds"
        run.finished_at = datetime.utcnow()

    finally:
        db.commit()
        db.refresh(run)

        try:
            Path(bat_path).unlink(missing_ok=True)
        except OSError:
            pass

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
        .filter(NoteRun.status.in_(["launched", "running", "interactive"]))
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

def _read_new_log_text(log_path: Path, offset: int) -> tuple[str, int]:
    if not log_path.exists():
        return "", offset

    with log_path.open("r", encoding="utf-8", errors="replace") as file:
        file.seek(offset)
        text = file.read()
        return text, file.tell()


def _append_stdout(run_id: int, text: str) -> None:
    if not text:
        return

    db = SessionLocal()

    try:
        run = db.get(NoteRun, run_id)

        if run is None:
            return

        run.stdout = (run.stdout or "") + text
        db.commit()

    finally:
        db.close()


def _finish_execute_run(
    run_id: int,
    return_code: int,
    timed_out: bool,
    timeout_seconds: int,
) -> None:
    db = SessionLocal()

    try:
        run = db.get(NoteRun, run_id)

        if run is None:
            return

        run.return_code = return_code
        run.finished_at = datetime.utcnow()

        if timed_out:
            run.status = "failed"
            run.stderr = (
                (run.stderr or "")
                + f"\nTimeout: {timeout_seconds} seconds"
            )
        else:
            run.status = "success" if return_code == 0 else "failed"

        db.commit()

    finally:
        db.close()

def _read_marker_exit_code(marker_path: Path) -> int:
    try:
        text = marker_path.read_text(encoding="utf-8-sig").strip()
        return int(text)
    except (OSError, ValueError):
        return -1
    
def _mark_execute_run_interactive(
    run_id: int,
    return_code: int,
) -> None:
    db = SessionLocal()

    try:
        run = db.get(NoteRun, run_id)

        if run is None:
            return

        run.return_code = return_code
        run.status = "interactive"
        run.stdout = (
            (run.stdout or "")
            + "\n[Executable Notes] Interactive console is ready.\n"
        )
        db.commit()

    finally:
        db.close()

def _watch_visible_execute_process(
    run_id: int,
    note_id: int,
    process: subprocess.Popen,
    log_path: Path,
    marker_path: Path,
    bat_path: str,
    ps1_path: str,
    window_title: str,
    timeout_seconds: int,
    take_screenshot_on_finish: bool,
    close_console: bool,
) -> None:
    offset = 0
    deadline = time.monotonic() + timeout_seconds
    timed_out = False
    screenshot_taken = False
    marker_detected = False

    while process.poll() is None:
        text, offset = _read_new_log_text(log_path, offset)
        _append_stdout(run_id, text)

        if marker_path.exists() and not marker_detected:
            marker_detected = True
            screenshot_taken = True

            if take_screenshot_on_finish:
                _append_stdout(
                    run_id,
                    f"\n[Executable Notes] Screenshot marker detected: {marker_path}\n",
                )
                _capture_execute_screenshot(
                    run_id=run_id,
                    note_id=note_id,
                    window_title=window_title,
                )

            if not close_console:
                return_code = _read_marker_exit_code(marker_path)
                _mark_execute_run_interactive(
                    run_id=run_id,
                    return_code=return_code,
                )

        if not marker_detected and time.monotonic() > deadline:
            timed_out = True
            screenshot_taken = True

            if take_screenshot_on_finish:
                _capture_execute_screenshot(
                    run_id=run_id,
                    note_id=note_id,
                    window_title=window_title,
                )

            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                capture_output=True,
                text=True,
            )
            break

        time.sleep(1)

    return_code = process.wait()

    text, offset = _read_new_log_text(log_path, offset)
    _append_stdout(run_id, text)

    if take_screenshot_on_finish and not screenshot_taken:
        _capture_execute_screenshot(
            run_id=run_id,
            note_id=note_id,
            window_title=window_title,
        )

    _finish_execute_run(
        run_id=run_id,
        return_code=return_code,
        timed_out=timed_out,
        timeout_seconds=timeout_seconds,
    )

    for temp_path in [bat_path, ps1_path, str(marker_path)]:
        try:
            Path(temp_path).unlink(missing_ok=True)
        except OSError:
            pass

def _capture_execute_screenshot(
    run_id: int,
    note_id: int,
    window_title: str,
) -> None:
    db = SessionLocal()

    try:
        existing_screenshot = (
            db.query(NoteScreenshot)
            .filter(NoteScreenshot.run_id == run_id)
            .first()
        )

        if existing_screenshot is not None:
            return

        try:
            screenshot = capture_window_screenshot_by_title(
                db=db,
                note_id=note_id,
                window_title=window_title,
                prefix=f"run_{run_id}",
                run_id=run_id,
            )
        except Exception as error:
            screenshot = None
            capture_error = str(error)
        else:
            capture_error = ""

        run = db.get(NoteRun, run_id)

        if run is None:
            return

        if screenshot is None:
            detail = (
                f"\nスクリーンショット取得に失敗しました。"
                f"\n対象ウィンドウ: {window_title}"
            )

            if capture_error:
                detail += f"\n原因: {capture_error}"

            run.stderr = (run.stderr or "") + detail
        else:
            run.stdout = (
                (run.stdout or "")
                + f"\n[Executable Notes] Screenshot saved: {screenshot.file_name}\n"
            )

        db.commit()

    finally:
        db.close()