const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function show(t) {
  document.querySelectorAll('main>section').forEach(s => s.hidden = s.id !== t);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  const labels = { home: ['Operations overview', 'Overview'], cpu: ['CPU scheduling', 'CPU Scheduling'], pc: ['Producer–consumer', 'Producer–Consumer'], bank: ["Banker's algorithm", "Banker's Algorithm"], mem: ['Memory management', 'Memory Management'], lab: ['OS Concepts Lab', 'Learning Studio'] };
  if (labels[t]) {
    $('page-title').textContent = labels[t][0];
    $('breadcrumb').textContent = labels[t][1];
  }
  $('sidebar').classList.remove('open');
  $('menu-toggle').setAttribute('aria-expanded', 'false');
}

document.querySelectorAll('[data-t],[data-go]').forEach(b => {
  b.onclick = () => show(b.dataset.t || b.dataset.go);
});

function done(k, info) {
  if (info) S[k] = info;
  dash();
  const e = $('st-' + k);
  if (e) {
    e.textContent = 'Executed';
    e.classList.add('done');
  }
}

const S = { cpu: null, bank: null, mem: null };
function dash() {
  $('k-proc').textContent = procs.length;
  $('k-queue').textContent = buf.length + ' / ' + cap;
  $('k-queue-note').textContent = buf.length === cap ? 'Buffer is full' : `${cap - buf.length} slot${cap - buf.length === 1 ? '' : 's'} available`;
  $('k-cpu').textContent = S.cpu || 'Not run';
  $('k-res').textContent = S.bank || 'Not run';
  $('k-mem').textContent = S.mem || 'Not run';
  const steps = document.querySelectorAll('#lifecycle .life-step');
  if (!steps.length) return;
  const complete = [buf.length > 0, !!S.cpu, !!S.mem, !!S.bank];
  steps.forEach((step, index) => {
    step.classList.toggle('complete', index > 0 && complete[index - 1]);
    step.classList.toggle('active', index === 0 || (index > 0 && complete[index - 1] && !complete[index]));
  });
}

document.getElementById('menu-toggle').onclick = () => {
  const open = $('sidebar').classList.toggle('open');
  $('menu-toggle').setAttribute('aria-expanded', String(open));
};

$('algo').onchange = () => {
  $('priority-mode-field').hidden = $('algo').value !== 'PRIO';
  $('quantum').closest('.field').hidden = $('algo').value !== 'RR';
};

const isInt = (v, min) => Number.isInteger(v) && v >= min;

document.querySelectorAll('[data-lab]').forEach(tab => tab.onclick = () => {
  document.querySelectorAll('.lab-pane').forEach(pane => pane.hidden = pane.id !== 'lab-' + tab.dataset.lab);
  document.querySelectorAll('[data-lab]').forEach(item => item.classList.toggle('active', item === tab));
});

function parseSeries(value, label) {
  const values = value.split(',').map(item => Number(item.trim()));
  if (!values.length || values.some(item => !Number.isInteger(item) || item < 0)) throw new Error(`${label} must contain non-negative whole numbers.`);
  return values;
}
function labMessage(id, html) { $(id).innerHTML = html; }
function resetLab(type) {
  const defaults = { sync: '<p class="muted">Choose a simulation mode to see states, ordering, and final balance.</p>', states: '<p class="muted">Run the trace to see context switches between banking processes.</p>', deadlock: '', pages: '', disk: '', files: '', threads: '' };
  if (type === 'files') labFiles = [];
  if ($(type + '-out')) $(type === 'deadlock' ? $('deadlock-out') : $(type + '-out')).innerHTML = defaults[type];
}
function runSync(locked) {
  const balance = Number($('sync-balance').value);
  if (!Number.isFinite(balance) || balance < 0) return labMessage('sync-out', '<p class="bad">Enter a non-negative opening balance.</p>');
  const withdrawals = [300, 250];
  const events = locked
    ? withdrawals.map((amount, i) => `T${i + 1}: Ready → Running → lock acquired → balance − ${amount} → Completed`)
    : ['T1: reads 1000', 'T2: reads 1000', 'T1: writes 700', 'T2: writes 750'];
  const finalBalance = locked ? balance - withdrawals.reduce((a, b) => a + b, 0) : balance - withdrawals[1];
  labMessage('sync-out', `<span class="allocation-status ${locked ? 'allocated' : 'failed'}">${locked ? 'Mutex enabled' : 'Race condition exposed'}</span><ol>${events.map(e => `<li>${e}</li>`).join('')}</ol><p><b>Final balance:</b> ${finalBalance}. ${locked ? 'Each critical section completed exclusively; no update was lost.' : 'The second write overwrote the first update, leaving an incorrect balance.'}</p>`);
}
function runStates() {
  const processes = ['ATM Withdrawal', 'Cash Deposit', 'Fund Transfer', 'Balance Inquiry'];
  labMessage('states-out', `<div class="state-list">${processes.map((name, i) => `<div><b>P${i + 1} · ${name}</b><span>New → Ready → Running → ${i % 2 ? 'Waiting → Ready → ' : ''}Terminated</span></div>`).join('')}</div><p class="info">Context switches occur when the scheduler dispatches another ready process or the running process blocks.</p>`);
}
function matrix(value) { return value.split(';').map(row => row.split(',').map(Number)); }
function runDeadlock() {
  try {
    const available = parseSeries($('dead-avail').value, 'Available');
    const allocation = matrix($('dead-alloc').value), request = matrix($('dead-req').value);
    if (allocation.length !== request.length || allocation.some((row, i) => row.length !== available.length || request[i].length !== available.length)) throw new Error('Matrices must have matching dimensions.');
    const work = [...available], finish = allocation.map(row => row.every(value => value === 0));
    let progress = true;
    while (progress) {
      progress = false;
      for (let i = 0; i < allocation.length; i++) if (!finish[i] && request[i].every((value, j) => value <= work[j])) {
        allocation[i].forEach((value, j) => work[j] += value); finish[i] = true; progress = true;
      }
    }
    const blocked = finish.map((done, i) => done ? '' : `P${i}`).filter(Boolean);
    labMessage('deadlock-out', `<p class="${blocked.length ? 'bad' : 'ok'}">${blocked.length ? `Potential deadlock detected involving ${blocked.join(', ')}.` : 'No deadlock detected; all processes can be completed.'}</p><p>Available before: [${available.join(', ')}] · Available after simulation: [${work.join(', ')}]</p><p class="info">Recovery education: terminate one blocked process, release its allocation, then run detection again.</p>`);
  } catch (error) { labMessage('deadlock-out', `<p class="bad">${error.message}</p>`); }
}
function pageRun(refs, frames, mode) {
  const memory = [], rows = []; let hits = 0, faults = 0, fifoPointer = 0;
  refs.forEach((page, index) => {
    const hit = memory.includes(page); if (hit) hits++; else { faults++; if (memory.length < frames) memory.push(page); else {
      let victim = 0;
      if (mode === 'FIFO') victim = fifoPointer++ % frames;
      if (mode === 'LRU') victim = memory.reduce((best, value, i) => refs.slice(0, index).lastIndexOf(value) < refs.slice(0, index).lastIndexOf(memory[best]) ? i : best, 0);
      if (mode === 'OPT') victim = memory.reduce((best, value, i) => { const next = refs.slice(index + 1).indexOf(value); const bestNext = refs.slice(index + 1).indexOf(memory[best]); return (next < 0 ? Infinity : next) > (bestNext < 0 ? Infinity : bestNext) ? i : best; }, 0);
      memory[victim] = page;
    }} rows.push(`<tr><td>${page}</td><td>${memory.join(' · ')}</td><td class="${hit ? 'hit' : 'fault'}">${hit ? 'Hit' : 'Fault'}</td></tr>`);
  });
  return { hits, faults, html: `<table><tr><th>Reference</th><th>Frames</th><th>Result</th></tr>${rows.join('')}</table>` };
}
function runPages() {
  try { const refs = parseSeries($('page-ref').value, 'Reference string'); const frames = Number($('page-frames').value); if (!Number.isInteger(frames) || frames < 1) throw new Error('Frames must be a positive whole number.');
    const results = ['FIFO', 'LRU', 'OPT'].map(mode => ({ mode, ...pageRun(refs, frames, mode) }));
    labMessage('pages-out', `<div class="scroll"><table><tr><th>Algorithm</th><th>Hits</th><th>Faults</th><th>Hit ratio</th><th>Fault ratio</th></tr>${results.map(r => `<tr><td><b>${r.mode}</b></td><td>${r.hits}</td><td>${r.faults}</td><td>${(r.hits / refs.length * 100).toFixed(1)}%</td><td>${(r.faults / refs.length * 100).toFixed(1)}%</td></tr>`).join('')}</table></div><details><summary>Step-by-step tables</summary>${results.map(r => `<h3>${r.mode}</h3>${r.html}`).join('')}</details>`);
  } catch (error) { labMessage('pages-out', `<p class="bad">${error.message}</p>`); }
}
function runDisk() {
  try { const requests = parseSeries($('disk-req').value, 'Requests'), head = Number($('disk-head').value), max = Number($('disk-max').value), direction = $('disk-dir').value; if (head > max || requests.some(r => r > max)) throw new Error('Requests and head must be inside the cylinder range.');
    const order = (name) => { let pending = [...requests], current = head, sequence = []; if (name === 'FCFS') sequence = pending;
      else if (name === 'SSTF') while (pending.length) { const i = pending.reduce((best, r, j) => Math.abs(r - current) < Math.abs(pending[best] - current) ? j : best, 0); sequence.push(pending.splice(i, 1)[0]); current = sequence.at(-1); }
      else { const sorted = [...pending].sort((a, b) => a - b), lower = sorted.filter(r => r < head).reverse(), higher = sorted.filter(r => r >= head); sequence = direction === 'up' ? [...higher, max, ...lower] : [...lower, 0, ...higher]; if (name === 'C-SCAN') sequence = direction === 'up' ? [...higher, max, 0, ...lower] : [...lower, 0, max, ...higher]; }
      let position = head, movement = 0; sequence.forEach(r => { movement += Math.abs(r - position); position = r; }); return { sequence, movement };
    };
    labMessage('disk-out', `<table><tr><th>Algorithm</th><th>Service order</th><th>Total movement</th></tr>${['FCFS', 'SSTF', 'SCAN', 'C-SCAN'].map(name => { const r = order(name); return `<tr><td><b>${name}</b></td><td>${[head, ...r.sequence].join(' → ')}</td><td>${r.movement}</td></tr>`; }).join('')}</table>`);
  } catch (error) { labMessage('disk-out', `<p class="bad">${error.message}</p>`); }
}
let labFiles = [];
function createLabFile() { const name = $('file-name').value.trim(), size = Number($('file-size').value); if (!name || !Number.isInteger(size) || size < 1 || size > 12) return labMessage('files-out', '<p class="bad">Enter a file name and 1–12 blocks.</p>'); labFiles.push({ name, size }); renderLabFiles(); }
function renderLabFiles() { labMessage('files-out', `<div class="file-map">${labFiles.map((file, i) => `<div><b>${esc(file.name)}</b><span>Contiguous: B${i * 3 + 1}–B${i * 3 + file.size}</span><span>Linked: ${Array.from({ length: file.size }, (_, j) => 'B' + (i * 3 + j + 1)).join(' → ')}</span><span>Indexed: index B${i + 1} → ${file.size} data blocks</span><button class="alt" onclick="labFiles.splice(${i},1);renderLabFiles()">Remove</button></div>`).join('')}</div>`); }
function runThreads() { labMessage('threads-out', '<div class="thread-timeline"><div><b>Validation thread</b><span>Validate request → shared memory read</span></div><div><b>Logging thread</b><span>Write audit event → shared memory write</span></div><div><b>Notification thread</b><span>Prepare confirmation → complete</span></div></div><p class="info">Threads share a process address space, so shared writes need synchronization. This is a visual model, not real browser threads.</p>'); }

/* ---------- MODULE 1: CPU SCHEDULING ---------- */
let procs = [];
let editingIndex = null;

function loadProcs() {
  procs = [
    ['P1', 'ATM Withdrawal', 0, 5, 2],
    ['P2', 'Cash Deposit', 1, 3, 1],
    ['P3', 'Fund Transfer', 2, 8, 4],
    ['P4', 'Balance Inquiry', 3, 2, 3],
    ['P5', 'Transaction Record Update', 4, 4, 5]
  ].map(a => ({ id: a[0], name: a[1], at: a[2], bt: a[3], pr: a[4] }));
  clearCPUResults();
  drawProcs();
}

function drawProcs() {
  $('ptab').innerHTML = '<tr><th>ID</th><th>Transaction</th><th>Arrival</th><th>Burst</th><th>Priority</th><th></th></tr>' +
    procs.map((p, i) => `
      <tr>
        <td>${esc(p.id)}</td>
        <td>${esc(p.name)}</td>
        <td>${p.at}</td>
        <td>${p.bt}</td>
        <td>${p.pr}</td>
        <td><button class="alt" onclick="editProc(${i})">Edit</button> <button class="alt" onclick="removeProc(${i})">Remove</button></td>
      </tr>
    `).join('') + (procs.length ? '' : '<tr><td colspan="6" class="muted">No processes. Add a process or load the sample set.</td></tr>');
  dash();
}

function clearCPUResults() {
  $('cpu-out').innerHTML = '<p class="muted">Run the scheduler to see the Gantt chart and calculations.</p>';
  S.cpu = null;
  const status = $('st-cpu');
  status.textContent = 'Ready';
  status.classList.remove('done');
}

function removeProc(index) {
  if (!Number.isInteger(index) || index < 0 || index >= procs.length) return;
  procs.splice(index, 1);
  clearCPUResults();
  drawProcs();
}

function resetCPU() {
  procs = [];
  editingIndex = null;
  ['c-id', 'c-name', 'c-at', 'c-bt', 'c-pr'].forEach(field => $(field).value = '');
  $('algo').value = 'FCFS';
  $('quantum').value = '2';
  clearCPUResults();
  drawProcs();
}

function addProc() {
  const id = $('c-id').value.trim();
  const name = $('c-name').value.trim() || id;
  const atText = $('c-at').value.trim();
  const btText = $('c-bt').value.trim();
  const prText = $('c-pr').value.trim();
  const at = Number(atText);
  const bt = Number(btText);
  const pr = Number(prText);

  if (!id || !atText || !btText || !prText ||
      !Number.isSafeInteger(at) || at < 0 ||
      !Number.isSafeInteger(bt) || bt < 1 ||
      !Number.isSafeInteger(pr) || pr < 1) {
    return alert('Enter a process ID, arrival >= 0, burst >= 1, and priority >= 1 (whole numbers).');
  }
  if (procs.some((p, index) => index !== editingIndex && p.id.toLowerCase() === id.toLowerCase())) {
    return alert('Process ID already exists.');
  }

  if (editingIndex === null) procs.push({ id, name, at, bt, pr });
  else procs[editingIndex] = { id, name, at, bt, pr };
  editingIndex = null;
  ['c-id', 'c-name', 'c-at', 'c-bt', 'c-pr'].forEach(field => $(field).value = '');
  clearCPUResults();
  drawProcs();
}

function editProc(index) {
  const process = procs[index];
  if (!process) return;
  editingIndex = index;
  $('c-id').value = process.id;
  $('c-name').value = process.name;
  $('c-at').value = process.at;
  $('c-bt').value = process.bt;
  $('c-pr').value = process.pr;
  $('c-id').focus();
  cpuMessage(`Editing ${process.id}. Update the fields and choose Add process to save.`, false);
}

function schedule(list, algo, q) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Add at least one process before running the scheduler.');
  }
  if (!['FCFS', 'SJF', 'PRIO', 'RR'].includes(algo)) {
    throw new Error('Choose a supported scheduling algorithm.');
  }
  if (algo === 'RR' && (!Number.isSafeInteger(q) || q < 1)) {
    throw new Error('Time quantum must be a whole number >= 1.');
  }

  const jobs = list.map((p, index) => ({ ...p, index, remaining: p.bt }));
  if (jobs.some(p => typeof p.id !== 'string' || !p.id.trim() ||
      !Number.isSafeInteger(p.at) || p.at < 0 ||
      !Number.isSafeInteger(p.bt) || p.bt < 1 ||
      !Number.isSafeInteger(p.pr) || p.pr < 1)) {
    throw new Error('Each process needs an ID, arrival >= 0, burst >= 1, and priority >= 1 (whole numbers).');
  }
  if (new Set(jobs.map(p => p.id.toLowerCase())).size !== jobs.length) {
    throw new Error('Process IDs must be unique.');
  }

  const completed = new Map();
  const execution = [];
  let currentTime = 0;
  const byArrival = (a, b) => a.at - b.at || a.index - b.index;

  if (algo === 'RR') {
    const order = [...jobs].sort(byArrival);
    const ready = [];
    let nextArrivalIndex = 0;
    let doneCount = 0;

    while (doneCount < jobs.length) {
      while (nextArrivalIndex < order.length && order[nextArrivalIndex].at <= currentTime) {
        ready.push(order[nextArrivalIndex]);
        nextArrivalIndex += 1;
      }

      if (!ready.length) {
        const nextArrival = order[nextArrivalIndex].at;
        if (nextArrival > currentTime) {
          execution.push({ id: null, s: currentTime, e: nextArrival });
          currentTime = nextArrival;
        }
        continue;
      }

      const proc = ready.shift();
      const run = Math.min(q, proc.remaining);
      if (!Number.isSafeInteger(currentTime + run)) {
        throw new Error('Combined process times exceed the safe calculation range.');
      }
      execution.push({ id: proc.id, s: currentTime, e: currentTime + run });
      currentTime += run;
      proc.remaining -= run;

      while (nextArrivalIndex < order.length && order[nextArrivalIndex].at <= currentTime) {
        ready.push(order[nextArrivalIndex]);
        nextArrivalIndex += 1;
      }

      if (proc.remaining > 0) {
        ready.push(proc);
      } else {
        completed.set(proc.id, currentTime);
        doneCount += 1;
      }
    }
  } else {
    while (completed.size < jobs.length) {
      const candidates = jobs.filter(p => !completed.has(p.id) && p.at <= currentTime);

      if (!candidates.length) {
        const next = jobs
          .filter(p => !completed.has(p.id))
          .sort(byArrival)[0];
        execution.push({ id: null, s: currentTime, e: next.at });
        currentTime = next.at;
        continue;
      }

      let proc;
      if (algo === 'FCFS') {
        proc = candidates.sort(byArrival)[0];
      } else if (algo === 'SJF') {
        proc = candidates.sort((a, b) => a.bt - b.bt || byArrival(a, b))[0];
      } else {
        proc = candidates.sort((a, b) => a.pr - b.pr || byArrival(a, b))[0];
      }

      const start = currentTime;
      const finish = start + proc.bt;
      if (!Number.isSafeInteger(finish)) {
        throw new Error('Combined process times exceed the safe calculation range.');
      }
      execution.push({ id: proc.id, s: start, e: finish });
      currentTime = finish;
      completed.set(proc.id, finish);
    }
  }

  const rows = list.map(p => {
    const ct = completed.get(p.id);
    const tat = ct - p.at;
    const wt = tat - p.bt;
    return { ...p, ct, tat, wt };
  });

  return { rows, execution, totalTime: currentTime };
}

function runCPU() {
  if (!procs.length) return alert('Add processes first.');

  const algo = $('algo').value;
  const q = +$('quantum').value;

  if (algo === 'RR' && (!Number.isSafeInteger(q) || q < 1)) {
    return alert('Time quantum must be a whole number >= 1.');
  }

  let result;
  try {
    result = schedule(procs, algo, q);
  } catch (error) {
    return alert(error.message);
  }
  const { rows, execution, totalTime } = result;
  const average = key => (rows.reduce((sum, r) => sum + r[key], 0) / rows.length).toFixed(2);

  const executionOrder = execution.filter(s => s.id).map(s => esc(s.id)).join(' → ') || 'None';
  const gantt = execution.map(seg => {
    const width = Math.max(seg.e - seg.s, 1);
    const label = seg.id ? esc(seg.id) : 'Idle';
    const small = `${seg.s}–${seg.e}`;
    return `<div class="seg ${seg.id ? '' : 'idle'}" style="flex:${width} 0 ${width * 30}px">${label}<small>${small}</small></div>`;
  }).join('');

  $('cpu-out').innerHTML = `
    <h3>Gantt chart</h3>
    <div class="gantt">${gantt}</div>
    <p>Execution order: ${executionOrder} (finish time ${totalTime})</p>
    <div class="scroll">
      <table>
        <tr>
          <th>ID</th><th>Transaction</th><th>AT</th><th>BT</th><th>Priority</th><th>CT</th><th>TAT = CT − AT</th><th>WT = TAT − BT</th>
        </tr>
        ${rows.map(r => `
          <tr>
            <td>${esc(r.id)}</td>
            <td>${esc(r.name)}</td>
            <td>${r.at}</td>
            <td>${r.bt}</td>
            <td>${r.pr}</td>
            <td>${r.ct}</td>
            <td>${r.tat}</td>
            <td>${r.wt}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    <p><b>Average waiting time:</b> ${average('wt')} &nbsp; <b>Average turnaround time:</b> ${average('tat')}</p>
  `;

  done('cpu', algo + ' · Avg WT ' + average('wt'));
}

/* ---------- ADVANCED CPU SCHEDULING ---------- */
function scheduleAdvanced(list, algo, quantum, priorityMode) {
  if (!list.length) throw new Error('Add at least one process before running the scheduler.');
  if (algo === 'RR' && (!Number.isSafeInteger(quantum) || quantum < 1)) throw new Error('Time quantum must be a positive whole number.');
  const jobs = list.map((p, index) => ({ ...p, index, remaining: p.bt, firstStart: null }));
  const ids = jobs.map(p => p.id.toLowerCase());
  if (new Set(ids).size !== ids.length) throw new Error('Process IDs must be unique.');
  if (jobs.some(p => !p.id.trim() || !Number.isSafeInteger(p.at) || p.at < 0 || !Number.isSafeInteger(p.bt) || p.bt < 1 || !Number.isSafeInteger(p.pr) || p.pr < 1)) {
    throw new Error('Arrival must be >= 0, burst must be >= 1, and priority must be a positive whole number.');
  }
  const byId = (a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()) || a.index - b.index;
  const byArrival = (a, b) => a.at - b.at || byId(a, b);
  const execution = [];
  const completed = new Map();
  let time = 0;
  const addSegment = (id, start, end) => {
    if (end <= start) return;
    const previous = execution[execution.length - 1];
    if (previous && previous.id === id && previous.e === start) previous.e = end;
    else execution.push({ id, s: start, e: end });
  };
  const complete = () => jobs.every(p => p.remaining === 0);
  const choose = candidates => candidates.sort((a, b) => {
    if (algo === 'SRTF') return a.remaining - b.remaining || byArrival(a, b);
    if (algo === 'PRIO') return a.pr - b.pr || byArrival(a, b);
    if (algo === 'SJF') return a.bt - b.bt || byArrival(a, b);
    return byArrival(a, b);
  })[0];

  if (algo === 'RR') {
    const order = [...jobs].sort(byArrival);
    const queue = [];
    let next = 0;
    while (!complete()) {
      while (next < order.length && order[next].at <= time) queue.push(order[next++]);
      if (!queue.length) {
        addSegment(null, time, order[next].at);
        time = order[next].at;
        continue;
      }
      const job = queue.shift();
      if (job.firstStart === null) job.firstStart = time;
      const run = Math.min(quantum, job.remaining);
      addSegment(job.id, time, time + run);
      time += run;
      job.remaining -= run;
      while (next < order.length && order[next].at <= time) queue.push(order[next++]);
      if (job.remaining) queue.push(job);
      else completed.set(job.id, time);
    }
  } else if (algo === 'SRTF' || (algo === 'PRIO' && priorityMode === 'P')) {
    while (!complete()) {
      const candidates = jobs.filter(p => p.remaining > 0 && p.at <= time);
      if (!candidates.length) {
        const next = jobs.filter(p => p.remaining > 0).sort(byArrival)[0];
        addSegment(null, time, next.at);
        time = next.at;
        continue;
      }
      const job = choose(candidates);
      if (job.firstStart === null) job.firstStart = time;
      addSegment(job.id, time, time + 1);
      job.remaining -= 1;
      time += 1;
      if (!job.remaining) completed.set(job.id, time);
    }
  } else {
    while (!complete()) {
      const candidates = jobs.filter(p => p.remaining > 0 && p.at <= time);
      if (!candidates.length) {
        const next = jobs.filter(p => p.remaining > 0).sort(byArrival)[0];
        addSegment(null, time, next.at);
        time = next.at;
        continue;
      }
      const job = choose(candidates);
      if (job.firstStart === null) job.firstStart = time;
      addSegment(job.id, time, time + job.bt);
      time += job.bt;
      job.remaining = 0;
      completed.set(job.id, time);
    }
  }
  const rows = list.map(p => {
    const job = jobs.find(item => item.id === p.id);
    const ct = completed.get(p.id);
    const tat = ct - p.at;
    return { ...p, ct, tat, wt: tat - p.bt, rt: job.firstStart - p.at };
  });
  return { rows, execution, totalTime: time };
}

function cpuMessage(message, error = false) {
  const el = $('cpu-feedback');
  if (el) { el.textContent = message; el.className = 'feedback ' + (error ? 'error' : 'success'); }
}

function renderCPUResult(result, label) {
  const { rows, execution, totalTime } = result;
  const average = key => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
  const busy = rows.reduce((sum, row) => sum + row.bt, 0);
  const colors = {};
  rows.forEach((row, i) => colors[row.id] = `cpu-color-${i % 6}`);
  const gantt = execution.map(seg => `<div class="seg ${seg.id ? colors[seg.id] : 'idle'}" style="flex:${Math.max(seg.e - seg.s, 1)} 0 ${Math.max(seg.e - seg.s, 1) * 30}px">${seg.id ? esc(seg.id) : 'Idle'}<small>${seg.s}–${seg.e}</small></div>`).join('');
  $('cpu-out').innerHTML = `<h3>Gantt chart</h3><div class="gantt">${gantt}</div><div class="gantt-legend">${rows.map(row => `<span><i class="${colors[row.id]}"></i>${esc(row.id)}</span>`).join('')}<span><i class="idle"></i>Idle</span></div><div class="metric-grid"><div><span>Avg waiting</span><strong>${average('wt').toFixed(2)}</strong><small>Σ WT / n</small></div><div><span>Avg turnaround</span><strong>${average('tat').toFixed(2)}</strong><small>Σ TAT / n</small></div><div><span>Avg response</span><strong>${average('rt').toFixed(2)}</strong><small>Σ RT / n</small></div><div><span>CPU utilization</span><strong>${totalTime ? (busy / totalTime * 100).toFixed(1) : '0.0'}%</strong><small>Busy / elapsed</small></div><div><span>Throughput</span><strong>${totalTime ? (rows.length / totalTime).toFixed(3) : '0.000'}</strong><small>Completed / elapsed</small></div></div><div class="scroll"><table><tr><th>ID</th><th>Transaction</th><th>AT</th><th>BT</th><th>Priority</th><th>CT</th><th>TAT</th><th>WT</th><th>RT</th></tr>${rows.map(row => `<tr><td>${esc(row.id)}</td><td>${esc(row.name)}</td><td>${row.at}</td><td>${row.bt}</td><td>${row.pr}</td><td>${row.ct}</td><td>${row.tat}</td><td>${row.wt}</td><td>${row.rt}</td></tr>`).join('')}</table></div><p class="info">TAT = CT − AT · WT = TAT − BT · RT = first CPU start − AT.</p>`;
  $('cpu-result-algo').textContent = label;
}

function runCPU() {
  const algo = $('algo').value;
  const quantum = Number($('quantum').value);
  const mode = $('priority-mode').value;
  try {
    const label = algo === 'PRIO' ? `${mode === 'P' ? 'Preemptive' : 'Non-preemptive'} Priority` : algo;
    const result = scheduleAdvanced(procs, algo, quantum, mode);
    renderCPUResult(result, label);
    cpuMessage(`${label} completed successfully.`, false);
    done('cpu', label);
    simulation = { result, cursor: 0, elapsed: 0, paused: true };
    updateSimulation();
  } catch (error) { cpuMessage(error.message, true); }
}

function compareAlgorithms() {
  try {
    const quantum = Number($('quantum').value);
    const mode = $('priority-mode').value;
    const options = [['FCFS', 'FCFS'], ['SJF', 'SJF'], ['SRTF', 'SRTF'], ['RR', `Round Robin (q=${quantum})`], ['PRIO', `${mode === 'P' ? 'Preemptive' : 'Non-preemptive'} Priority`]];
    const rows = options.map(([algorithm, label]) => {
      const result = scheduleAdvanced(procs, algorithm, quantum, mode);
      const avg = key => result.rows.reduce((sum, row) => sum + row[key], 0) / result.rows.length;
      const busy = result.rows.reduce((sum, row) => sum + row.bt, 0);
      return { label, wt: avg('wt'), tat: avg('tat'), rt: avg('rt'), util: result.totalTime ? busy / result.totalTime * 100 : 0, throughput: result.totalTime ? result.rows.length / result.totalTime : 0 };
    });
    $('comparison-out').innerHTML = `<div class="scroll"><table><tr><th>Algorithm</th><th>Avg WT</th><th>Avg TAT</th><th>Avg RT</th><th>CPU utilization</th><th>Throughput</th></tr>${rows.map(row => `<tr><td><b>${row.label}</b></td><td>${row.wt.toFixed(2)}</td><td>${row.tat.toFixed(2)}</td><td>${row.rt.toFixed(2)}</td><td>${row.util.toFixed(1)}%</td><td>${row.throughput.toFixed(3)}</td></tr>`).join('')}</table></div>`;
    $('comparison-panel').hidden = false;
    cpuMessage('Comparison completed using the same process workload.', false);
  } catch (error) { cpuMessage(error.message, true); }
}

let simulation = null;
function updateSimulation() {
  if (!simulation) return;
  const segment = simulation.result.execution[simulation.cursor];
  $('sim-time').textContent = simulation.elapsed;
  $('sim-running').textContent = segment ? (segment.id || 'Idle') : 'Complete';
  $('sim-queue').textContent = segment ? simulation.result.rows.filter(row => row.at <= simulation.elapsed && row.ct > simulation.elapsed).map(row => row.id).join(', ') || '—' : '—';
  $('sim-status').textContent = segment ? (simulation.paused ? 'Paused' : 'Ready') : 'Complete';
}
function nextSimulationStep() { if (simulation && simulation.cursor < simulation.result.execution.length) { const segment = simulation.result.execution[simulation.cursor++]; simulation.elapsed = segment.e; updateSimulation(); } }
function startSimulation() { if (!simulation) runCPU(); if (simulation) { simulation.paused = false; updateSimulation(); } }
function pauseSimulation() { if (simulation) { simulation.paused = true; updateSimulation(); } }
function resumeSimulation() { startSimulation(); }
function resetSimulation() { simulation = null; if ($('sim-time')) { $('sim-time').textContent = '0'; $('sim-running').textContent = 'Idle'; $('sim-queue').textContent = '—'; $('sim-status').textContent = 'Ready'; } }

/* ---------- MODULE 2: PRODUCER-CONSUMER ---------- */
let buf = [], cap = 5, tid = 0, plog = [];
const items = ['ATM Withdrawal', 'Cash Deposit', 'Fund Transfer', 'Balance Inquiry', 'Transaction Record Update'];

function setCap() {
  const c = +$('cap').value;
  if (!isInt(c, 1) || c > 12) {
    return alert('Capacity must be between 1 and 12.');
  }
  cap = c;
  buf = [];
  tid = 0;
  plog = [];
  drawPC();
}

function plogAdd(message) {
  plog.unshift(message);
  if (plog.length > 40) plog.pop();
}

function produce() {
  if (buf.length >= cap) {
    plogAdd('Producer blocked: transaction queue is full. No overflow allowed.');
  } else {
    tid += 1;
    const txn = { id: 'TXN-' + (1000 + tid), name: items[(tid - 1) % items.length] };
    buf.push(txn);
    plogAdd(`Producer: request ${txn.id} (${txn.name}) added to queue at position ${buf.length}.`);
  }
  drawPC();
  done('pc');
}

function consume() {
  if (!buf.length) {
    plogAdd('Consumer blocked: transaction queue is empty. No underflow allowed.');
  } else {
    const txn = buf.shift();
    plogAdd(`Consumer: processed ${txn.id} (${txn.name}) from the front of the queue in FIFO order.`);
  }
  drawPC();
  done('pc');
}

function drawPC() {
  const n = buf.length;
  $('pc-stat').textContent = `Capacity ${cap} | Transactions in queue = ${n} | Free slots = ${cap - n} | Mutex = 1 | Status: ${n === cap ? 'FULL' : n === 0 ? 'EMPTY' : 'PARTIAL'}`;

  let html = '';
  for (let i = 0; i < cap; i++) {
    const txn = buf[i];
    if (txn) {
      html += `<div class="slot f"><b>Position ${i + 1}</b>${i === 0 ? ' (front)' : ''}<br>${txn.id}<br>${txn.name}</div>`;
    } else {
      html += `<div class="slot">Position ${i + 1}<br>Empty</div>`;
    }
  }

  $('slots').innerHTML = html;
  $('pc-log').innerHTML = plog.map(msg => `<div>${esc(msg)}</div>`).join('');
}

/* ---------- MODULE 3: BANKER'S ALGORITHM ---------- */
const RN = ['Database Connections', 'Transaction Processing Services', 'ATM Communication Channels'];
const rname = j => RN[j] || 'R' + j;

function tbl(pre, n, m, d) {
  let html = '<table><tr><th></th>' + Array.from({ length: m }, (_, j) => `<th>${rname(j)}</th>`).join('') + '</tr>';

  for (let i = 0; i < n; i++) {
    html += `<tr><th>P${i}</th>`;
    for (let j = 0; j < m; j++) {
      const value = d && d[i] && d[i][j] !== undefined ? d[i][j] : 0;
      html += `<td><input type="number" min="0" id="${pre}-${i}-${j}" value="${value}"></td>`;
    }
    html += '</tr>';
  }
  return html + '</table>';
}

function buildGrid(A, M, V) {
  let n = Number($('bn').value);
  let m = Number($('bm').value);

  if (!Number.isInteger(n) || n < 1 || n > 8) {
    $('bn').value = '5';
    n = 5;
  }
  if (!Number.isInteger(m) || m < 1 || m > 6) {
    $('bm').value = '3';
    m = 3;
  }

  $('bgrid').innerHTML = `
    <div class="mxgrid">
      <div class="mx"><b>Allocation</b>${tbl('a', n, m, A)}</div>
      <div class="mx"><b>Maximum</b>${tbl('x', n, m, M)}</div>
      <div class="mx"><b>Available</b>${tbl('v', 1, m, V ? [V] : null).replace('<th>P0</th>', '<th>Avail</th>')}</div>
    </div>
  `;
}

function loadBank(type) {
  const examples = {
    safe: {
      A: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
      M: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
      V: [3, 3, 2]
    },
    unsafe: {
      A: [[2, 1, 1], [1, 2, 1], [1, 1, 2]],
      M: [[4, 3, 3], [3, 4, 3], [3, 3, 4]],
      V: [1, 0, 0]
    }
  };

  const ex = examples[type];
  if (!ex) return;

  $('bn').value = ex.A.length;
  $('bm').value = 3;
  buildGrid(ex.A, ex.M, ex.V);
  runBank();
}

function readM(pre, n, m) {
  const matrix = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < m; j++) {
      const value = Number($(`${pre}-${i}-${j}`).value);
      if (!Number.isInteger(value) || value < 0) return null;
      row.push(value);
    }
    matrix.push(row);
  }
  return matrix;
}

function readAvailable(m) {
  const row = [];
  for (let j = 0; j < m; j++) {
    const value = Number($(`v-0-${j}`).value);
    if (!Number.isInteger(value) || value < 0) return null;
    row.push(value);
  }
  return row;
}

function mt(title, data, prefix = 'P') {
  const columns = data[0].map((_, j) => `<th>${rname(j)}</th>`).join('');
  const rows = data.map((row, i) => `<tr><th>${prefix}${i}</th>${row.map(v => `<td>${v}</td>`).join('')}</tr>`).join('');
  return `<div class="mx"><b>${title}</b><table><tr><th></th>${columns}</tr>${rows}</table></div>`;
}

function runBank() {
  const n = +$('bn').value;
  const m = +$('bm').value;

  if (!$('v-0-0')) {
    buildGrid();
  }

  const A = readM('a', n, m);
  const X = readM('x', n, m);
  const V = readAvailable(m);

  if (!A || !X || !V) {
    return alert('All resource values must be whole numbers >= 0.');
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (A[i][j] > X[i][j]) {
        return alert(`Invalid state: Allocation exceeds Maximum for P${i} on ${rname(j)}.`);
      }
    }
  }

  const need = X.map((row, i) => row.map((val, j) => val - A[i][j]));
  const work = [...V];
  const finish = Array(n).fill(false);
  const safeSeq = [];

  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < n; i++) {
      if (!finish[i] && need[i].every((val, j) => val <= work[j])) {
        for (let j = 0; j < m; j++) {
          work[j] += A[i][j];
        }
        finish[i] = true;
        safeSeq.push('P' + i);
        progress = true;
      }
    }
  }

  const safe = finish.every(Boolean);
  const blocked = finish.map((done, i) => done ? '' : 'P' + i).filter(Boolean).join(', ');

  $('bank-out').innerHTML = `
    ${mt('Allocation', A)}
    ${mt('Maximum', X)}
    ${mt('Need = Maximum − Allocation', need)}
    <div class="mx"><b>Available</b><table><tr><th>Resource</th><th>Units</th></tr>${V.map((v, j) => `<tr><th>${rname(j)}</th><td>${v}</td></tr>`).join('')}</table></div>
    ${safe ? `<p class="ok">SAFE state. Safe sequence: ${safeSeq.join(' → ')}</p>` : `<p class="bad">UNSAFE state. No safe sequence exists. Blocked processes: ${blocked || 'None'}.</p>`}
  `;

  done('bank', safe ? 'Safe state' : 'Unsafe state');
}

buildGrid();

/* ---------- MODULE 4: MEMORY MANAGEMENT ---------- */
const MN = ['ATM Withdrawal', 'Cash Deposit', 'Fund Transfer', 'Balance Inquiry', 'Transaction Record Update'];

function runMem() {
  const parse = s => s.split(',').map(x => x.trim()).filter(x => x !== '').map(Number);
  const blocks = parse($('blocks').value);
  const processSizes = parse($('msizes').value);
  const algo = $('malgo').value;

  if (!blocks.length || !processSizes.length || blocks.some(v => !isInt(v, 1)) || processSizes.some(v => !isInt(v, 1))) {
    return alert('Enter whole numbers >= 1 separated by commas.');
  }

  if (processSizes.length > 5 && !confirm('More than 5 transactions: names will repeat. Continue?')) {
    return;
  }

  const owner = Array(blocks.length).fill(-1);
  const results = [];

  processSizes.forEach((size, idx) => {
    let pick = -1;
    for (let b = 0; b < blocks.length; b++) {
      if (owner[b] !== -1 || blocks[b] < size) continue;
      if (algo === 'FF') {
        pick = b;
        break;
      }
      if (pick === -1 || blocks[b] < blocks[pick]) {
        pick = b;
      }
    }

    if (pick >= 0) owner[pick] = idx;
    results.push({ idx, size, block: pick });
  });

  const nameFor = i => MN[i] || 'Transaction ' + (i + 1);
  const totalMemory = blocks.reduce((sum, b) => sum + b, 0);
  const allocatedMemory = results.filter(r => r.block >= 0).reduce((sum, r) => sum + r.size, 0);
  const internalFrag = results.filter(r => r.block >= 0).reduce((sum, r) => sum + (blocks[r.block] - r.size), 0);
  const freeBlocks = blocks.filter((_, b) => owner[b] === -1).reduce((sum, b) => sum + b, 0);

  $('mem-out').innerHTML = `
    <div class="bar">
      ${blocks.map((size, b) => {
        const procIndex = owner[b];
        if (procIndex >= 0) {
          const usedPercent = (processSizes[procIndex] / size) * 100;
          return `<div class="blk" style="flex:${size} 0 0"><div style="display:flex;height:100%"><div class="used" style="width:${usedPercent}%">P${procIndex + 1}</div><div class="free"></div></div></div>`;
        }
        return `<div class="blk" style="flex:${size} 0 0"><div class="free"></div></div>`;
      }).join('')}
    </div>
    <p class="note">Blocks: ${blocks.map((s, idx) => `B${idx + 1}=${s}KB`).join(', ')}. Dark segments are allocated; light segments are free.</p>
    <div class="scroll">
      <table>
        <tr><th>Process</th><th>Transaction</th><th>Size</th><th>Block</th><th>Internal fragmentation</th><th>Status</th></tr>
        ${results.map(r => `
          <tr>
            <td>P${r.idx + 1}</td>
            <td>${nameFor(r.idx)}</td>
            <td>${r.size}</td>
            <td>${r.block >= 0 ? `B${r.block + 1} (${blocks[r.block]}KB)` : '<span class="bad">NOT ALLOCATED</span>'}</td>
            <td>${r.block >= 0 ? `${blocks[r.block] - r.size} KB` : '-'}</td>
            <td><span class="${r.block >= 0 ? 'allocation-status allocated' : 'allocation-status failed'}">${r.block >= 0 ? 'Allocated' : 'Unallocated'}</span></td>
          </tr>
        `).join('')}
      </table>
    </div>
    <p>Total memory ${totalMemory} KB | Allocated to transactions ${allocatedMemory} KB | Utilization ${(allocatedMemory / totalMemory * 100).toFixed(1)}% | Internal fragmentation ${internalFrag} KB | Free unused blocks ${freeBlocks} KB | Total free ${(totalMemory - allocatedMemory)} KB</p>
    ${results.some(r => r.block < 0) ? '<p class="bad">Some transactions failed to allocate due to insufficient free memory block size.</p>' : '<p class="ok">All transactions allocated successfully.</p>'}
  `;

  done('mem', (allocatedMemory / totalMemory * 100).toFixed(1) + '% utilized');
}

loadProcs();
$('algo').onchange();
drawPC();
const _dp = drawProcs, _dq = drawPC;
drawProcs = function () { _dp(); dash(); };
drawPC = function () { _dq(); dash(); };
dash();
