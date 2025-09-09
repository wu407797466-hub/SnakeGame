# Repository Guidelines

## Project Structure & Module Organization
- `src/` – game source (e.g., `SnakeGame/`, `game/`, or `main.*`).
- `assets/` – sprites, sounds, and fonts used in-game.
- `tests/` – unit/integration tests mirroring `src/` layout.
- `docs/` – design notes or screenshots (optional).

Example: `src/SnakeGame/Board.cs` or `src/game/engine.py`; tests reside under `tests/...` with matching names.

## Build, Test, and Development Commands
- Run (Python): `python -m venv .venv && .venv/Scripts/pip install -r requirements.txt && .venv/Scripts/python -m game`
- Test (Python): `.venv/Scripts/pytest -q`
- Build (C#/.NET): `dotnet build src/SnakeGame.sln -c Release`
- Run (C#/.NET): `dotnet run --project src/SnakeGame`
- Test (.NET): `dotnet test`

Use the commands that match the stack present in this repo. Place local-only settings in `.env` or `appsettings.Development.json` (do not commit secrets).

## Coding Style & Naming Conventions
- Python: 4-space indent; format with `black` and `isort`; lint with `flake8` or `ruff`. Modules: `snake_case.py`, classes: `PascalCase`, functions/vars: `snake_case`.
- C#/.NET: follow `.editorconfig`; 4-space indent; `PascalCase` for types and methods, `camelCase` for locals/fields (prefix `_` for private fields). One class per file under matching folder.
- Assets: lowercase, hyphenated filenames (e.g., `apple-red.png`).

## Testing Guidelines
- Mirror source names: `tests/test_board.py` or `tests/BoardTests.cs`.
- Aim for fast unit tests; prefer deterministic logic for movement, collisions, and scoring.
- Coverage goal: core engine and rules > 80%.
- Run all tests before pushing (`pytest` or `dotnet test`).

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Keep commits focused; include brief rationale and context.
- PRs must include: concise description, screenshots/GIFs for UI changes, steps to reproduce or test, and linked issues.
- Ensure CI is green and code is formatted/linted.

## Security & Configuration Tips
- Never commit secrets; use environment variables or user secrets (`dotnet user-secrets`) during development.
- Validate input read from files or configs (e.g., level data) and guard against crashes from invalid assets.
