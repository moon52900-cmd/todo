# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running

No build step. Open `index.html` directly in a browser, or serve with Python:

```
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Architecture

Three files — no framework, no dependencies:

- **`index.html`** — static shell. The `<ul id="todo-list">` and `<footer id="footer">` are populated entirely by JS; their initial HTML is just placeholders.
- **`style.css`** — CSS custom properties at `:root` for theming. Layout via flexbox. Checkbox uses `appearance: none` with a hand-drawn checkmark via `::after`.
- **`app.js`** — single `state` object `{ todos, filter, editingId }`. All mutations go through named functions that call `persist()` then the caller calls `render()`. `render()` is a full redraw (no diffing); it calls `renderList()`, `renderFooter()`, and `renderToggleAll()` independently.

## Data model

Each todo: `{ id: UUID, text: string, completed: boolean, createdAt: timestamp }`.  
Persisted to `localStorage` under the key `todo-app-items`.

## Key behaviors

- **Inline edit**: double-click a label → sets `state.editingId` → `render()` replaces the row with an `<input class="edit-input">`. Blur commits; Escape cancels (removes the blur listener before blurring to avoid saving).
- **Toggle all**: rotates between all-complete and all-incomplete based on whether `every` todo is currently done.
- **Filter**: stored in `state.filter`; only affects `filteredTodos()` used by `renderList()`. The full `state.todos` array is always the source of truth for counts and toggle-all.
