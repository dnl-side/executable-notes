@echo off
setlocal

chcp 65001 >nul

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "FRONTEND_URL=http://localhost:5173"

echo ========================================
echo Executable Notes - Development Startup
echo ========================================
echo.

echo [1/6] Python を確認しています...
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python が見つかりません。PATHを確認してください。
    pause
    exit /b 1
)

python --version

echo.
echo [2/6] npm を確認しています...
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm が見つかりません。Node.js / PATHを確認してください。
    pause
    exit /b 1
)

call npm -v

echo.
echo [3/6] Backend 環境を準備しています...

if not exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    echo .venv が存在しないため作成します...
    python -m venv "%BACKEND_DIR%\.venv"
    if errorlevel 1 (
        echo [ERROR] venv の作成に失敗しました。
        pause
        exit /b 1
    )
) else (
    echo .venv は既に存在します。
)

call "%BACKEND_DIR%\.venv\Scripts\activate.bat"

echo pip を更新しています...
python -m pip install --upgrade pip

echo Python 依存関係を確認・インストールしています...
python -m pip install -r "%BACKEND_DIR%\requirements.txt"
if errorlevel 1 (
    echo [ERROR] Python 依存関係のインストールに失敗しました。
    pause
    exit /b 1
)

echo スクリーンショット依存関係を確認しています...
python -c "import pyautogui, pyscreeze, pygetwindow; from PIL import Image; print('Screenshot dependencies OK')"
if errorlevel 1 (
    echo [ERROR] スクリーンショット依存関係の確認に失敗しました。
    echo pillow / pyscreeze / pyautogui / pygetwindow を確認してください。
    pause
    exit /b 1
)

echo.
echo [4/6] Frontend 環境を準備しています...

if not exist "%FRONTEND_DIR%\node_modules" (
    echo node_modules が存在しないため npm install を実行します...
    pushd "%FRONTEND_DIR%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install に失敗しました。
        pause
        exit /b 1
    )
    popd
) else (
    echo node_modules は既に存在します。
)

echo.
echo [5/6] Backend と Frontend を起動しています...

start "Executable Notes API" /D "%BACKEND_DIR%" cmd /k "call .venv\Scripts\activate.bat && fastapi dev app\main.py"

start "Executable Notes Frontend" /D "%FRONTEND_DIR%" cmd /k "npm run dev"

echo.
echo [6/6] Frontend の起動完了を待機しています...
echo URL: %FRONTEND_URL%

powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='%FRONTEND_URL%'; $limit=(Get-Date).AddSeconds(90); while((Get-Date) -lt $limit){ try { $r=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){ exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"

if errorlevel 1 (
    echo [WARNING] Frontend の起動確認がタイムアウトしました。
    echo 手動で確認してください: %FRONTEND_URL%
) else (
    echo Frontend の起動を確認しました。
    echo Edge を開きます...
    start "" msedge "%FRONTEND_URL%"
)

echo.
echo Startup 処理が完了しました。
endlocal