'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'todo-app-items';

const EMPTY_MESSAGES = {
  active:    '진행중인 할 일이 없습니다 🎉',
  completed: '완료된 할 일이 없습니다',
};

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  todos:     load(),
  filter:    'all',
  editingId: null,
};

// ── Persistence ────────────────────────────────────────────────────────────
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
}

// ── Selectors ──────────────────────────────────────────────────────────────
function activeCount()    { return state.todos.filter(t => !t.completed).length; }
function completedCount() { return state.todos.filter(t =>  t.completed).length; }

function filteredTodos() {
  const { todos, filter } = state;
  if (filter === 'active')    return todos.filter(t => !t.completed);
  if (filter === 'completed') return todos.filter(t =>  t.completed);
  return todos;
}

// ── Mutations ──────────────────────────────────────────────────────────────
function addTodo(text, time) {
  text = text.trim();
  if (!text) return false;
  state.todos.push({
    id:        crypto.randomUUID(),
    text,
    time:      time || '',
    completed: false,
    createdAt: Date.now(),
  });
  persist();
  return true;
}

function toggleTodo(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) { todo.completed = !todo.completed; persist(); }
}

function deleteTodo(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  persist();
}

function editTodo(id, newText, newTime) {
  newText = newText.trim();
  if (!newText) { deleteTodo(id); return; }
  const todo = state.todos.find(t => t.id === id);
  if (todo) {
    todo.text = newText;
    todo.time = newTime !== undefined ? newTime : todo.time;
    persist();
  }
  state.editingId = null;
}

function toggleAll() {
  const allDone = state.todos.every(t => t.completed);
  state.todos.forEach(t => { t.completed = !allDone; });
  persist();
}

function clearCompleted() {
  state.todos = state.todos.filter(t => !t.completed);
  persist();
}

// ── Render helpers ─────────────────────────────────────────────────────────
function createCheckbox(todo) {
  const cb = document.createElement('input');
  cb.type      = 'checkbox';
  cb.className = 'todo-checkbox';
  cb.checked   = todo.completed;
  cb.setAttribute('aria-label', '완료 토글');
  cb.addEventListener('change', () => { toggleTodo(todo.id); render(); });
  return cb;
}

function createLabel(todo) {
  const label = document.createElement('label');
  label.className = 'todo-label';

  if (todo.time) {
    const badge = document.createElement('span');
    badge.className   = 'todo-time-badge';
    badge.textContent = todo.time;
    label.appendChild(badge);
  }

  label.appendChild(document.createTextNode(todo.text));
  label.addEventListener('dblclick', () => {
    state.editingId = todo.id;
    render();
  });
  return label;
}

function createDeleteBtn(todo) {
  const btn = document.createElement('button');
  btn.className = 'delete-btn';
  btn.textContent = '×';
  btn.setAttribute('aria-label', '삭제');
  btn.addEventListener('click', () => { deleteTodo(todo.id); render(); });
  return btn;
}

function createEditControls(todo) {
  const wrapper = document.createElement('div');
  wrapper.className = 'edit-wrapper';

  const timeInput = document.createElement('input');
  timeInput.type      = 'time';
  timeInput.className = 'edit-time';
  timeInput.value     = todo.time || '';
  timeInput.setAttribute('aria-label', '시간 수정');

  const textInput = document.createElement('input');
  textInput.className = 'edit-input';
  textInput.value     = todo.text;
  textInput.setAttribute('aria-label', '내용 수정');

  let committed = false;

  const commit = () => {
    // Wait a tick — if focus moved to the sibling input, don't commit yet
    setTimeout(() => {
      if (document.activeElement === timeInput || document.activeElement === textInput) return;
      if (committed) return;
      committed = true;
      editTodo(todo.id, textInput.value, timeInput.value);
      render();
    }, 80);
  };

  const cancel = () => {
    committed = true;
    state.editingId = null;
    render();
  };

  timeInput.addEventListener('blur', commit);
  textInput.addEventListener('blur', commit);

  timeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { textInput.focus(); }   // move to text field
    if (e.key === 'Escape') { cancel(); }
  });

  textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { textInput.blur(); }    // triggers blur → commit
    if (e.key === 'Escape') { cancel(); }
  });

  wrapper.append(timeInput, textInput);

  requestAnimationFrame(() => {
    textInput.focus();
    textInput.setSelectionRange(textInput.value.length, textInput.value.length);
  });

  return wrapper;
}

function createTodoItem(todo) {
  const li = document.createElement('li');
  li.className  = `todo-item${todo.completed ? ' completed' : ''}`;
  li.dataset.id = todo.id;

  if (state.editingId === todo.id) {
    li.classList.add('editing');
    li.appendChild(createEditControls(todo));
  } else {
    li.append(createCheckbox(todo), createLabel(todo), createDeleteBtn(todo));
  }

  return li;
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderList() {
  const list  = document.getElementById('todo-list');
  const items = filteredTodos();
  list.innerHTML = '';

  if (items.length === 0 && state.todos.length > 0) {
    const li = document.createElement('li');
    li.className   = 'empty-state';
    li.textContent = EMPTY_MESSAGES[state.filter] || '';
    list.appendChild(li);
    return;
  }

  items.forEach(todo => list.appendChild(createTodoItem(todo)));
}

function renderFooter() {
  const footer    = document.getElementById('footer');
  const countEl   = document.getElementById('item-count');
  const clearBtn  = document.getElementById('clear-completed');

  if (state.todos.length === 0) {
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'flex';

  const n = activeCount();
  countEl.innerHTML = `<strong>${n}</strong> ${n === 1 ? '개' : '개'} 남음`;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === state.filter);
  });

  clearBtn.classList.toggle('visible', completedCount() > 0);
}

function renderToggleAll() {
  const btn = document.getElementById('toggle-all');
  if (state.todos.length === 0) {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'flex';
    btn.classList.toggle('all-done', state.todos.every(t => t.completed));
  }
}

function render() {
  renderList();
  renderFooter();
  renderToggleAll();
}

// ── Event bindings ─────────────────────────────────────────────────────────
function bindEvents() {
  // Add todo on Enter
  document.getElementById('new-todo').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const timeInput = document.getElementById('new-time');
    if (addTodo(e.target.value, timeInput.value)) {
      e.target.value  = '';
      timeInput.value = '';
      render();
    }
  });

  // Toggle all
  document.getElementById('toggle-all').addEventListener('click', () => {
    toggleAll();
    render();
  });

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      render();
    });
  });

  // Clear completed
  document.getElementById('clear-completed').addEventListener('click', () => {
    clearCompleted();
    render();
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
bindEvents();
render();
