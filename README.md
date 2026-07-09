# Executable Notes

ローカル開発作業を「実行できるノート」として管理するための学習・検証用アプリケーションです。

React / TypeScript のフロントエンド、FastAPI のバックエンド、SQLite による永続化、Python の `subprocess` によるローカルコマンド実行、`pyautogui` によるスクリーンショット取得を組み合わせて、開発作業の起動・実行・証跡保存を試すために作成しました。

本アプリは商用サービスではなく、ローカル環境での自動化、開発補助ツール、実行ログ管理、簡易的な証跡取得の仕組みを理解するための実践用プロジェクトです。

## 目的

通常のメモアプリではなく、メモに登録したコマンドを実行できる「Executable Notes」を管理します。

想定している用途は以下の通りです。

- よく使う開発コマンドをノートとして保存する
- Java / Node.js / Python などの環境確認コマンドを実行する
- テストやビルドコマンドを実行し、ログを残す
- 開発サーバーを起動し、URLの起動確認を行う
- 実行結果のスクリーンショットを証跡として保存する
- 古いログやスクリーンショットを自動的に整理する

## 主な機能

### ノート管理

ダッシュボード上でノートの作成、編集、選択、削除ができます。

各ノートには以下の情報を設定できます。

- タイトル
- ノート種別
- 実行モード
- 作業フォルダ
- シェル設定
- 起動後に開くURL
- 本文 / コマンド
- 実行設定

### Execute モード

`execute` は、実行して終了を待つコマンド向けのモードです。

例:

```cmd
java -version
mvn test
npm run build
```

対応している内容:

- 表示コンソールでの実行
- 非表示でのバックグラウンド実行
- タイムアウト制御
- stdout / stderr の保存
- 実行ステータス管理
- 実行後スクリーンショット取得
- 実行後にコンソールを残して手動作業を継続

### Launch モード

`launch` は、開発サーバーなどの長時間起動するプロセス向けのモードです。

例:

```cmd
npm run dev
python -m http.server 8000
mvn spring-boot:run
```

対応している内容:

- 開発サーバーの起動
- PID の保存
- 起動状態の管理
- 指定URLの応答待機
- Microsoft Edge でURLを開く
- 起動後ページのスクリーンショット取得
- ダッシュボードからの停止

### スクリーンショット証跡

`pyautogui` を利用して、実行結果のスクリーンショットを保存します。

現在の動作:

- Execute モードでは、実行後のコンソール画面を取得
- Launch モードでは、起動後に開いたページ画面を取得
- 手動でのスクリーンショット取得にも対応
- スクリーンショットはノートおよび実行履歴に紐づけて保存

### ログ保持制御

実行ログが増え続けないように、各ノートごとに保持する実行履歴数を制限しています。

古い実行履歴、関連するスクリーンショット、ログファイルは自動的に削除されます。

## 技術構成

### Frontend

- React
- TypeScript
- Vite

### Backend

- Python
- FastAPI
- SQLAlchemy
- SQLite
- subprocess
- pyautogui
- pygetwindow
- Pillow

### 実行環境

現在は Windows ローカル環境での利用を前提としています。

表示コンソールの起動、Microsoft Edge の起動、`pyautogui` によるスクリーンショット取得など、Windows デスクトップ上での動作を想定しています。

## ディレクトリ構成

```text
executable-notes/
  start-dev.bat
  README.md

  backend/
    app/
      main.py
      database.py
      models.py
      schemas.py
      routers/
      services/
    storage/
      logs/
      screenshots/
      uploads/
    requirements.txt

  frontend/
    src/
      api/
      components/
      hooks/
      types/
      utils/
    package.json
```

## セットアップ

### 前提条件

- Windows
- Python 3.11 以降推奨
- Node.js / npm
- Microsoft Edge

### 開発環境の起動

プロジェクトルートで以下を実行します。

```cmd
start-dev.bat
```

このバッチファイルでは、以下をまとめて実行します。

- Python 仮想環境の作成
- Backend 依存パッケージのインストール
- スクリーンショット関連ライブラリの確認
- Frontend 依存パッケージのインストール
- FastAPI Backend の起動
- Vite Frontend の起動
- ブラウザでダッシュボードを開く

デフォルトのフロントエンドURL:

```text
http://localhost:5173
```

## Backend を手動起動する場合

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
fastapi dev app\main.py
```

## Frontend を手動起動する場合

```cmd
cd frontend
npm install
npm run dev
```

## ノート作成例

### 環境確認ノート

```cmd
java -version
mvn -v
node -v
npm -v
```

推奨設定:

```text
run_mode = execute
show_console = true
close_console = true
take_screenshot_on_finish = true
```

### テスト実行ノート

```cmd
mvn test
```

推奨設定:

```text
run_mode = execute
timeout_seconds = 900
show_console = true
close_console = false
take_screenshot_on_finish = true
```

`close_console = false` にすることで、実行後もコンソールを残し、そのまま手動で追加確認を行うことができます。

### 開発サーバー起動ノート

```cmd
npm run dev
```

推奨設定:

```text
run_mode = launch
open_url = http://localhost:3000
timeout_seconds = 900
take_screenshot_on_finish = true
console_wait_seconds = 5
```

この設定では、開発サーバーを起動し、URLの応答を待機した後、Edgeでページを開き、画面のスクリーンショットを取得します。

## 実行設定

各ノートには実行時の動作を制御する設定があります。

### timeout_seconds

実行やURL待機の最大秒数です。

### take_screenshot_on_finish

有効にすると、実行結果のスクリーンショットを保存します。

### console_wait_seconds

スクリーンショット取得前、またはコンソールを閉じる前に待機する秒数です。

### show_console

有効にすると、処理を表示コンソールで実行します。

無効の場合はバックグラウンド実行となり、stdout / stderr をログとして保存します。

### close_console

Execute モードで使用します。

無効にすると、実行後もコンソールを残し、そのまま手動作業を続けることができます。

## 現在の制限事項

- Windows ローカル環境での利用を前提としています。
- Backend 側では現在 `cmd` のみ対応しています。
- UI上には PowerShell の選択肢がありますが、Backend 側ではまだ実行対象外です。
- Edge のタブ制御は限定的です。
- Stop 操作では開発サーバーのプロセスを停止しますが、開いたブラウザタブは自動では閉じません。
- `pyautogui` によるスクリーンショット取得は、表示されているデスクトップ状態に依存します。
- 非表示実行では画面が存在しないため、スクリーンショットではなく stdout / stderr が主な証跡になります。
- 認証機能や複数ユーザー管理は実装していません。

## 学習・検証ポイント

このプロジェクトでは、以下の内容を実践的に確認しています。

- React と FastAPI の連携
- TypeScript によるフロントエンド状態管理
- SQLite / SQLAlchemy によるローカルデータ保存
- Python `subprocess` によるローカルコマンド実行
- 開発サーバーなどの長時間プロセス管理
- PID 管理とプロセス停止
- `pyautogui` による簡易的なGUI操作・証跡取得
- 実行ログとスクリーンショットの関連付け
- ノート単位での実行設定管理
- ローカル自動化ツールの設計

## 今後の改善候補

- PowerShell 実行対応
- GUI操作ノートの拡張
- hybrid ノートの実装
- スケジュール実行
- Windows Task Scheduler 連携
- READMEへの画面キャプチャ追加
- 実行履歴の詳細検索
- ログエクスポート機能

## 補足

Executable Notes は、ローカル開発作業を少しずつ自動化しながら、実行管理・証跡保存・プロセス制御の仕組みを理解するための実践プロジェクトです。

完成品として見せるためだけではなく、実際に自分の開発作業で使いながら改善していくことを目的としています。