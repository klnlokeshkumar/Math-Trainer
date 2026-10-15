(() => {
  const $ = id => document.getElementById(id);
  const state = { mode: 'count', catalog: [], pool: [], index: 0, current: null, history: [], correct: 0, answered: 0, running: false, locked: true, all: false, target: 30, deadline: 0, timer: null, nextTimer: null, startedAt: 0 };
  const denominators = [2, 4, 5, 8, 10, 20, 25, 40, 50, 100];

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  }
  function decimalText(number) { return String(Number(number.toFixed(8))); }
  function buildCatalog() {
    const examples = [];
    denominators.forEach(denominator => {
      for (let numerator = 1; numerator < denominator; numerator++) {
        const value = numerator / denominator;
        examples.push({ question: `${numerator} / ${denominator}`, answer: value, answerText: decimalText(value) });
      }
    });
    return examples;
  }
  function stopClocks() {
    if (state.timer) clearInterval(state.timer);
    if (state.nextTimer) clearTimeout(state.nextTimer);
    state.timer = null; state.nextTimer = null;
  }
  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
    $('countField').classList.toggle('hidden', mode !== 'count' || $('allMode').checked);
    $('timeField').classList.toggle('hidden', mode !== 'timed' || $('allMode').checked);
  }
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('allMode').addEventListener('change', () => {
    $('countField').classList.toggle('hidden', $('allMode').checked || state.mode !== 'count');
    $('timeField').classList.toggle('hidden', $('allMode').checked || state.mode !== 'timed');
  });
  function start() {
    stopClocks();
    state.catalog = buildCatalog(); state.pool = shuffle(state.catalog); state.index = 0; state.current = null;
    state.history = []; state.correct = 0; state.answered = 0; state.running = true; state.locked = true;
    state.startedAt = Date.now(); state.all = $('allMode').checked;
    if (state.all) state.target = state.pool.length;
    else if (state.mode === 'count') {
      state.target = Math.max(1, Math.min(10000, Number.parseInt($('count').value, 10) || 30));
      const rounds = [];
      while (rounds.length < state.target) rounds.push(...shuffle(state.catalog).slice(0, state.target - rounds.length));
      state.pool = rounds.slice(0, state.target);
    } else {
      state.target = Infinity;
      const minutes = Math.max(1, Math.min(180, Number.parseInt($('minutes').value, 10) || 5));
      state.deadline = Date.now() + minutes * 60000;
    }
    $('quiz').classList.remove('hidden'); $('done').classList.add('hidden');
    $('answer').disabled = false; $('submitBtn').disabled = false; $('stopBtn').disabled = false;
    $('startBtn').textContent = 'Restart practice ↻'; $('feedback').textContent = ''; $('feedback').className = 'feedback neutral';
    $('timerPill').textContent = state.all ? `${state.pool.length} EXAMPLES` : state.mode === 'timed' ? 'TIME LEFT: --:--' : `${state.target} QUESTIONS`;
    $('sessionNote').textContent = state.all ? 'Every built-in fraction appears once.' : 'Questions are shuffled; repeats wait until a new round.';
    if (state.mode === 'timed' && !state.all) { updateTimer(); state.timer = setInterval(updateTimer, 200); }
    showNext();
  }
  function updateTimer() {
    if (!state.running || state.mode !== 'timed' || state.all) return;
    const remaining = Math.max(0, state.deadline - Date.now()); const seconds = Math.ceil(remaining / 1000);
    $('timerPill').textContent = `TIME LEFT: ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    $('progressBar').style.width = `${Math.min(100, Math.max(0, (1 - remaining / Math.max(1, state.deadline - state.startedAt)) * 100))}%`;
    if (remaining <= 0) finish('time');
  }
  function showNext() {
    if (!state.running) return;
    if (state.mode === 'timed' && !state.all && Date.now() >= state.deadline) { finish('time'); return; }
    if (state.index >= state.pool.length) {
      if (state.mode === 'timed' && !state.all) { state.pool = shuffle(state.catalog); state.index = 0; }
      else { state.current = null; finish('complete'); return; }
    }
    state.current = state.pool[state.index]; state.locked = false;
    $('question').innerHTML = `${state.current.question} <span>= ?</span>`;
    $('answer').value = ''; $('answer').disabled = false; $('submitBtn').disabled = false;
    $('feedback').textContent = ''; $('feedback').className = 'feedback neutral';
    updateStats(); $('answer').focus({ preventScroll: true });
  }
  function checkAnswer(event) {
    if (event) event.preventDefault();
    if (!state.running || state.locked || !state.current) return;
    if (state.mode === 'timed' && !state.all && Date.now() >= state.deadline) { finish('time'); return; }
    const raw = $('answer').value.trim().replace(/,/g, '.');
    if (!raw || !Number.isFinite(Number(raw))) return;
    const numeric = Number(raw); const isCorrect = Math.abs(numeric - state.current.answer) < 0.00000001;
    state.answered++; if (isCorrect) state.correct++;
    state.history.push({ question: state.current.question, response: raw, answer: state.current.answerText, status: isCorrect ? 'Correct' : 'Wrong' });
    state.index++; state.locked = true; updateStats();
    if (isCorrect) { state.current = null; showNext(); }
    else {
      $('feedback').className = 'feedback bad'; $('feedback').textContent = `Not quite — the correct decimal is ${state.current.answerText}.`;
      $('answer').disabled = true; $('submitBtn').disabled = true;
      state.nextTimer = setTimeout(() => { state.nextTimer = null; if (state.running) { state.current = null; showNext(); } }, 1000);
    }
  }
  function updateStats() {
    const timed = state.mode === 'timed' && !state.all;
    $('progressStat').textContent = timed ? `${state.answered} answered` : `${Math.min(state.index + (state.locked ? 0 : 1), state.target)} / ${state.target}`;
    $('correctStat').textContent = state.correct; $('accuracyStat').textContent = state.answered ? `${Math.round(state.correct / state.answered * 100)}%` : '—';
    if (!timed) $('progressBar').style.width = `${Math.min(100, state.index / Math.max(1, state.target) * 100)}%`;
  }
  function addSkippedCurrent() {
    if (state.current && !state.locked) {
      const typed = $('answer').value.trim();
      state.history.push({ question: state.current.question, response: typed ? `${typed} (incomplete)` : 'Not answered', answer: state.current.answerText, status: 'Not answered' });
      state.current = null;
    }
  }
  function renderReview() {
    const body = $('resultsBody'); body.replaceChildren();
    state.history.forEach((item, index) => {
      const row = document.createElement('tr'); row.className = item.status === 'Correct' ? 'row-correct' : item.status === 'Wrong' ? 'row-wrong' : 'row-skipped';
      [String(index + 1), item.question, item.response, item.answer, item.status].forEach(text => { const cell = document.createElement('td'); cell.textContent = text; row.appendChild(cell); }); body.appendChild(row);
    });
    if (!state.history.length) { const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 5; cell.textContent = 'No questions were answered in this session.'; cell.style.textAlign = 'center'; row.appendChild(cell); body.appendChild(row); }
    const wrong = state.history.filter(item => item.status === 'Wrong').length; const skipped = state.history.filter(item => item.status === 'Not answered').length;
    $('reviewSummary').replaceChildren();
    [{label:'Correct',value:state.correct,cls:'good'},{label:'Wrong',value:wrong,cls:'bad'},{label:'Unanswered',value:skipped,cls:''},{label:'Accuracy',value:`${state.answered ? Math.round(state.correct/state.answered*100) : 0}%`,cls:''}].forEach(item => {
      const chip = document.createElement('div'); chip.className = `summary-chip ${item.cls}`; const strong = document.createElement('strong'); strong.textContent = item.value; const label = document.createElement('span'); label.textContent = item.label; chip.append(strong,label); $('reviewSummary').appendChild(chip);
    });
  }
  function finish(reason) {
    if (!state.running) return;
    addSkippedCurrent(); state.running = false; state.locked = true; stopClocks();
    $('answer').disabled = true; $('submitBtn').disabled = true; $('stopBtn').disabled = true;
    $('quiz').classList.add('hidden'); $('done').classList.remove('hidden');
    $('doneTitle').textContent = reason === 'time' ? 'Time is up!' : reason === 'manual' ? 'Session ended' : 'Session complete!';
    const wrong = state.history.filter(item => item.status === 'Wrong').length; const skipped = state.history.filter(item => item.status === 'Not answered').length;
    const accuracy = state.answered ? Math.round(state.correct/state.answered*100) : 0;
    $('doneText').textContent = `You answered ${state.answered} question${state.answered === 1 ? '' : 's'}: ${state.correct} correct and ${wrong} wrong (${accuracy}% accuracy).${skipped ? ` ${skipped} question${skipped === 1 ? ' was' : 's were'} left unanswered.` : ''}`;
    $('timerPill').textContent = reason === 'time' ? 'TIME EXPIRED' : 'SESSION FINISHED'; if (reason !== 'time') $('progressBar').style.width = '100%';
    $('sessionNote').textContent = 'Review your answers below to plan your next practice.'; renderReview();
  }
  $('answerForm').addEventListener('submit', checkAnswer); $('startBtn').addEventListener('click', start); $('againBtn').addEventListener('click', start); $('stopBtn').addEventListener('click', () => finish('manual'));
  state.catalog = buildCatalog();
})();
