(() => {
  const $ = id => document.getElementById(id);
  const state = {
    op: 'multiply', mode: 'count', selected: new Set([2,3,4,5,6,7,8,9,10]),
    pool: [], seedPool: [], index: 0, correct: 0, answered: 0, history: [],
    running: false, locked: true, deadline: 0, timer: null, nextTimer: null,
    current: null, all: false, target: 30, total: 30
  };

  const grid = $('tableGrid');
  for (let n = 1; n <= 30; n++) {
    const label = document.createElement('label'); label.className = 'table-chip';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = n; input.checked = state.selected.has(n);
    input.addEventListener('change', () => { input.checked ? state.selected.add(n) : state.selected.delete(n); updateHint(); });
    const span = document.createElement('span'); span.textContent = n;
    label.append(input, span); grid.append(label);
  }
  function refreshChips() { [...grid.querySelectorAll('input')].forEach(i => i.checked = state.selected.has(+i.value)); }
  $('selectAll').onclick = () => { state.selected = new Set(Array.from({length:30}, (_,i) => i+1)); refreshChips(); updateHint(); };
  $('selectNone').onclick = () => { state.selected.clear(); refreshChips(); updateHint(); };
  $('selectCommon').onclick = () => { state.selected = new Set(Array.from({length:12}, (_,i) => i+1)); refreshChips(); updateHint(); };

  document.querySelectorAll('[data-op]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-op]').forEach(item => item.classList.toggle('active', item === button));
    state.op = button.dataset.op;
    $('question').textContent = state.op === 'multiply' ? '8 × 7 = ?' : '56 ÷ 8 = ?';
    $('modeLabel').textContent = state.op === 'multiply' ? 'MULTIPLICATION' : 'DIVISION';
  }));
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('active', item === button));
    state.mode = button.dataset.mode;
    $('countField').classList.toggle('hidden', state.mode !== 'count' || $('allMode').checked);
    $('timeField').classList.toggle('hidden', state.mode !== 'timed' || $('allMode').checked);
  }));
  $('allMode').addEventListener('change', () => {
    $('countField').classList.toggle('hidden', $('allMode').checked || state.mode !== 'count');
    $('timeField').classList.toggle('hidden', $('allMode').checked || state.mode !== 'timed');
  });
  $('rangeStart').addEventListener('input', updateHint);
  $('rangeEnd').addEventListener('input', updateHint);

  function readRange() {
    const start = Number.parseInt($('rangeStart').value, 10);
    const end = Number.parseInt($('rangeEnd').value, 10);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1 || start > 1000 || end > 1000 || start > end) {
      throw new Error('Enter a valid range: start and end must be from 1 to 1000, and start must not exceed end.');
    }
    return { start, end };
  }
  function updateHint() {
    let rangeText = '';
    try { const range = readRange(); rangeText = `${range.end-range.start+1} values per table`; }
    catch (_) { rangeText = 'Check the start/end range'; }
    $('setupHint').textContent = state.selected.size
      ? `${state.selected.size} table${state.selected.size === 1 ? '' : 's'} selected · ${rangeText}.`
      : 'Select at least one table to begin.';
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function buildPool(range) {
    const questions = [];
    [...state.selected].sort((a,b) => a-b).forEach(table => {
      for (let factor = range.start; factor <= range.end; factor++) {
        if (state.op === 'multiply') {
          questions.push({ table, factor, answer: table * factor, text: `${table} × ${factor} = ?` });
        } else {
          questions.push({ table, factor, answer: factor, text: `${table * factor} ÷ ${table} = ?` });
        }
      }
    });
    return shuffle(questions);
  }
  function stopClocks() {
    if (state.timer) clearInterval(state.timer);
    if (state.nextTimer) clearTimeout(state.nextTimer);
    state.timer = null; state.nextTimer = null;
  }

  function start() {
    stopClocks();
    state.startedAt = Date.now();
    if (!state.selected.size) { $('setupHint').textContent = 'Please select at least one table.'; return; }
    let range;
    try { range = readRange(); }
    catch (error) { $('setupHint').textContent = error.message; return; }

    state.seedPool = buildPool(range);
    state.index = 0; state.correct = 0; state.answered = 0; state.history = [];
    state.running = true; state.locked = true; state.current = null; state.all = $('allMode').checked;
    if (state.all) {
      state.pool = state.seedPool.slice();
      state.target = state.pool.length;
    } else if (state.mode === 'count') {
      state.target = Math.max(1, Math.min(10000, Number.parseInt($('count').value, 10) || 30));
      state.pool = state.seedPool.slice();
      // Use every unique question before beginning a fresh shuffled pass.
      while (state.pool.length < state.target) {
        const round = shuffle(state.seedPool);
        if (round.length > 1 && round[0].text === state.pool[state.pool.length - 1].text) {
          [round[0], round[1]] = [round[1], round[0]];
        }
        state.pool.push(...round.slice(0, state.target - state.pool.length));
      }
      state.pool = state.pool.slice(0, state.target);
    } else {
      state.pool = state.seedPool.slice();
      const minutes = Math.max(1, Math.min(180, Number.parseInt($('minutes').value, 10) || 5));
      state.deadline = Date.now() + minutes * 60000;
    }
    state.total = state.all ? state.pool.length : (state.mode === 'count' ? state.target : Infinity);
    $('quiz').classList.remove('hidden');
    $('done').style.display = 'none';
    $('answer').disabled = false;
    $('stopBtn').disabled = false;
    $('startBtn').textContent = 'Restart practice ↻';
    $('feedback').className = 'feedback neutral'; $('feedback').textContent = '';
    $('timerPill').textContent = state.mode === 'timed' && !state.all ? 'TIME LEFT: --:--' : state.all ? `${state.pool.length} UNIQUE QUESTIONS` : `${state.target} QUESTIONS`;
    $('sessionNote').textContent = state.all ? 'Every selected table/range combination will appear once.' : 'Questions are shuffled; each combination is used before a new round.';
    if (state.mode === 'timed' && !state.all) {
      updateTimer();
      state.timer = setInterval(updateTimer, 200);
    }
    showNext();
  }

  function updateTimer() {
    if (!state.running || state.mode !== 'timed' || state.all) return;
    const remaining = Math.max(0, state.deadline - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    $('timerPill').textContent = `TIME LEFT: ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    $('progressBar').style.width = `${Math.min(100, Math.max(0, 100 - remaining / Math.max(1, state.deadline - state.startedAt) * 100))}%`;
    if (remaining <= 0) finish('time');
  }

  function showNext() {
    if (!state.running) return;
    if (state.mode === 'timed' && !state.all && Date.now() >= state.deadline) { finish('time'); return; }
    if (state.index >= state.pool.length) {
      if (state.mode === 'timed' && !state.all) {
        const lastText = state.pool.length ? state.pool[state.pool.length - 1].text : '';
        state.pool = shuffle(state.seedPool);
        if (state.pool.length > 1 && state.pool[0].text === lastText) [state.pool[0], state.pool[1]] = [state.pool[1], state.pool[0]];
        state.index = 0;
      } else {
        state.current = null;
        finish('complete');
        return;
      }
    }
    state.current = state.pool[state.index];
    state.locked = false;
    $('answer').value = '';
    $('answer').disabled = false;
    $('question').textContent = state.current.text;
    $('modeLabel').textContent = state.op === 'multiply' ? 'MULTIPLICATION' : 'DIVISION';
    $('feedback').className = 'feedback neutral'; $('feedback').textContent = '';
    updateStats();
    $('answer').focus({ preventScroll: true });
  }

  function submitAnswer() {
    if (!state.running || state.locked || !state.current) return;
    if (state.mode === 'timed' && !state.all && Date.now() >= state.deadline) { finish('time'); return; }
    const response = $('answer').value.trim();
    if (!response || !/^\d+$/.test(response)) return;
    const correctAnswer = String(state.current.answer);
    if (response.length < correctAnswer.length) return;

    const isCorrect = response === correctAnswer;
    state.answered++;
    if (isCorrect) state.correct++;
    state.history.push({ question: state.current.text, response, answer: correctAnswer, status: isCorrect ? 'Correct' : 'Wrong' });
    state.index++;
    state.locked = true;
    updateStats();

    if (isCorrect) {
      // Correct answers move on immediately, with no feedback pause.
      state.current = null;
      showNext();
    } else {
      $('feedback').className = 'feedback bad';
      $('feedback').textContent = `Incorrect — the correct answer is ${correctAnswer}.`;
      $('answer').disabled = true;
      state.nextTimer = setTimeout(() => {
        state.nextTimer = null;
        if (!state.running) return;
        state.current = null;
        showNext();
      }, 1000);
    }
  }

  $('answer').addEventListener('input', () => {
    const input = $('answer');
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 6);
    if (!state.running || state.locked || !state.current) return;
    const expectedDigits = String(state.current.answer).length;
    if (input.value.length >= expectedDigits) submitAnswer();
  });

  // Route number-key presses to the answer box whenever the learner's focus has drifted.
  document.addEventListener('keydown', event => {
    if (!state.running || state.locked || event.ctrlKey || event.metaKey || event.altKey) return;
    if (document.activeElement === $('answer')) return;
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault(); $('answer').focus({ preventScroll: true });
      $('answer').value += event.key; $('answer').dispatchEvent(new Event('input', { bubbles: true }));
    } else if (event.key === 'Backspace') {
      event.preventDefault(); $('answer').focus({ preventScroll: true });
      $('answer').value = $('answer').value.slice(0, -1);
    }
  });

  function updateStats() {
    const timed = state.mode === 'timed' && !state.all;
    if (timed) $('progressStat').textContent = `${state.answered} answered`;
    else $('progressStat').textContent = `${Math.min(state.index + (state.locked ? 0 : 1), state.total)} / ${state.total}`;
    $('correctStat').textContent = state.correct;
    $('accuracyStat').textContent = state.answered ? `${Math.round(state.correct / state.answered * 100)}%` : '—';
    if (!timed) $('progressBar').style.width = `${Math.min(100, state.index / Math.max(1, state.total) * 100)}%`;
  }

  function addSkippedCurrent() {
    if (state.current && !state.locked) {
      const typed = $('answer').value.trim();
      state.history.push({ question: state.current.text, response: typed ? `${typed} (incomplete)` : 'Not answered', answer: String(state.current.answer), status: 'Not answered' });
      state.current = null;
    }
  }
  function renderReview() {
    const body = $('resultsBody'); body.replaceChildren();
    let wrong = 0, skipped = 0;
    state.history.forEach((item, index) => {
      if (item.status === 'Wrong') wrong++;
      if (item.status === 'Not answered') skipped++;
      const row = document.createElement('tr');
      row.className = item.status === 'Correct' ? 'row-correct' : item.status === 'Wrong' ? 'row-wrong' : 'row-skipped';
      const values = [String(index + 1), item.question, item.response, item.answer, item.status];
      values.forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
      body.appendChild(row);
    });
    if (!state.history.length) {
      const row = document.createElement('tr'); const cell = document.createElement('td');
      cell.colSpan = 5; cell.textContent = 'No questions were answered in this session.'; cell.style.textAlign = 'center'; cell.style.color = 'var(--muted)';
      row.appendChild(cell); body.appendChild(row);
    }
    const accuracy = state.answered ? Math.round(state.correct / state.answered * 100) : 0;
    $('reviewSummary').replaceChildren();
    [
      { label: 'Correct', value: state.correct, cls: 'good' },
      { label: 'Wrong', value: wrong, cls: 'bad' },
      { label: 'Unanswered', value: skipped, cls: '' },
      { label: 'Accuracy', value: `${accuracy}%`, cls: '' }
    ].forEach(summary => {
      const chip = document.createElement('div'); chip.className = `summary-chip ${summary.cls}`;
      const strong = document.createElement('strong'); strong.textContent = summary.value;
      const label = document.createElement('span'); label.textContent = summary.label;
      chip.append(strong, label); $('reviewSummary').appendChild(chip);
    });
  }

  function finish(reason) {
    if (!state.running) return;
    addSkippedCurrent();
    state.running = false; state.locked = true; stopClocks();
    $('answer').disabled = true; $('stopBtn').disabled = true;
    $('quiz').classList.add('hidden'); $('done').style.display = 'block';
    $('doneTitle').textContent = reason === 'time' ? 'Time is up!' : reason === 'manual' ? 'Session ended' : 'Session complete!';
    const wrong = state.history.filter(item => item.status === 'Wrong').length;
    const skipped = state.history.filter(item => item.status === 'Not answered').length;
    const accuracy = state.answered ? Math.round(state.correct / state.answered * 100) : 0;
    $('doneText').textContent = `You answered ${state.answered} question${state.answered === 1 ? '' : 's'}: ${state.correct} correct and ${wrong} wrong (${accuracy}% accuracy).${skipped ? ` ${skipped} question${skipped === 1 ? ' was' : 's were'} left unanswered.` : ''}`;
    $('timerPill').textContent = reason === 'time' ? 'TIME EXPIRED' : 'SESSION FINISHED';
    $('progressBar').style.width = reason === 'time' ? $('progressBar').style.width : '100%';
    $('sessionNote').textContent = 'Review your answers below to see what to practise next.';
    renderReview();
  }

  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  $('stopBtn').addEventListener('click', () => finish('manual'));
  $('stage').addEventListener('click', event => {
    if (state.running && !state.locked && event.target !== $('stopBtn')) $('answer').focus({ preventScroll: true });
  });
  updateHint();
})();
