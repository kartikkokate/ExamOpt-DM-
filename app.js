'use strict';
const $ = id => document.getElementById(id);
const palette = ['#d4ea91','#bddde7','#e8cbea','#f4d4a6','#bcd9c8','#f0c9c7','#cccff0','#e2dfad'];
let current = null;
let editorData = null;
let viewMode = 'sessions';
const draftKey = 'examopt.draft.v1';
function saveDraft(text = $('data').value) {
  try {
    localStorage.setItem(draftKey,JSON.stringify({version:1,text,algorithm:$('algorithm').value,view:viewMode}));
    $('draft-status').textContent = 'Draft saved in this browser';
  } catch (_) { $('draft-status').textContent = 'Draft saving unavailable — download a backup'; }
}
function visibleSubjects(data) {
  const student = data.students.find(s => s.id === $('student-filter').value);
  const query = $('subject-search').value.trim().toLocaleLowerCase();
  return data.subjects.filter(s => (!student || student.subjects.includes(s.id)) && (!query || `${s.name} ${s.id}`.toLocaleLowerCase().includes(query)));
}
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color = (data,id) => palette[data.slots.findIndex(s => s.id === id) % palette.length];
function message(text, type) {
  $('message').textContent = text; $('message').className = type;
  $('result-status').textContent = text; $('result-status').className = `result-status ${type}`;
  window.ExamOptCompanion?.refresh();
}
function explainErrors(data,errors) {
  return errors.map(error => {
    const student = error.match(/^Student (.+) needs unique, known subject IDs\.$/);
    if (student) return `Student ${student[1]}: select at least one subject, and untick any missing subjects. In JSON, also remove repeated subject entries.`;
    const emptySubject = error.match(/^Subject (.+) has no enrolled students\.$/);
    if (emptySubject) return `${data.subjects.find(s => s.id === emptySubject[1])?.name || emptySubject[1]} has no students. Select it under Students, or remove the subject.`;
    const capacity = error.match(/^Room (.+) needs a positive integer capacity\.$/);
    if (capacity) return `Room ${capacity[1]}: enter a whole number of seats greater than zero.`;
    const emptyList = error.match(/^(subjects|students|rooms|slots) must be a nonempty array\.$/);
    if (emptyList) return `Add at least one ${ {subjects:'subject',students:'student',rooms:'room',slots:'exam session'}[emptyList[1]] } in ${emptyList[1] === 'slots' ? 'Exam sessions' : emptyList[1]}. If editing JSON, use a nonempty array.`;
    return error;
  }).join('\n');
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function clearResults() {
  current = null;
  for (const id of ['metrics','graph','legend','timetable','comparison','edge-count','diagnostics','student-summary']) $(id).replaceChildren();
  $('diagnostics').hidden = true; $('student-filter').disabled = true;
  $('subject-search').disabled = true;
  $('learning').hidden = true;
  $('schedule-note').textContent = 'Your details have changed. Create a new timetable to continue.';
  $('timetable').innerHTML = '<div class="empty-state"><strong>Your updated timetable will appear here.</strong><p>Finish editing your details, then select <b>Create timetable</b> in the exam details panel.</p></div>';
  $('export').disabled = true; $('print').disabled = true;
}
function generate() {
  try {
    const data = JSON.parse($('data').value);
    const errors = ExamEngine.validate(data);
    if (errors.length) throw new Error(explainErrors(data,errors));
    const comparison = ['dsatur','greedy'].map(a => ExamEngine.schedule(data, a));
    const result = $('algorithm').value === 'auto' ? [...comparison].sort((a,b) => b.entries.length-a.entries.length || a.usedSlots-b.usedSlots || (a.algorithm === 'dsatur' ? -1 : 1))[0] : comparison.find(r => r.algorithm === $('algorithm').value);
    if (result.violations.length) throw new Error(result.violations.join('\n'));
    current = { data, result };
    editorData = JSON.parse(JSON.stringify(data)); renderEditor();
    const selected = $('student-filter').value;
    $('student-filter').innerHTML = '<option value="">Everyone</option>' + data.students.map(s => `<option value="${escapeHTML(s.id)}">Student ${escapeHTML(s.id)}</option>`).join('');
    $('student-filter').value = data.students.some(s => s.id === selected) ? selected : '';
    $('student-filter').disabled = false;
    $('subject-search').disabled = false;
    renderMetrics(data, result); renderGraph(data, result); renderTimetable(data, result); renderComparison(comparison); renderDiagnostics(data,result);
    $('learning').hidden = false;
    saveDraft();
    message(result.unscheduled.length ? `${result.unscheduled.length} exam(s) could not be placed: ${result.unscheduled.join(', ')}. Review the explanations below the timetable for what to change.` : 'All exams scheduled. No student has two exams at the same time, and every assigned room has enough seats.', result.unscheduled.length ? 'warning' : 'success');
  } catch (error) { clearResults(); message(error instanceof SyntaxError ? `Invalid JSON: ${error.message}` : error.message, 'error'); }
}
function renderMetrics(data,r) {
  const metrics = [['Exams scheduled',`${r.entries.length}/${data.subjects.length}`,'total'],['Sessions used',r.usedSlots,`of ${data.slots.length}`],['Student clashes',0,'checked'],['Seats filled',`${Math.round(r.utilization)}%`,'in booked rooms']];
  $('metrics').innerHTML = metrics.map(([label,value,note]) => `<div class="metric"><small>${label}</small><strong>${value}</strong><span>${note}</span></div>`).join('');
}
function renderGraph(data,r) {
  const g = ExamEngine.graph(data), n = data.subjects.length;
  const positions = Object.fromEntries(data.subjects.map((s,i) => { const angle = 2*Math.PI*i/n-Math.PI/2; return [s.id, {x:320+Math.cos(angle)*215, y:155+Math.sin(angle)*112}]; }));
  const assignments = Object.fromEntries(r.entries.map(e => [e.subject,e.slot]));
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 640 310'); svg.setAttribute('aria-hidden','true');
  function element(type, attrs, text) {
    const el = document.createElementNS(svg.namespaceURI,type);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
    if (text !== undefined) el.textContent = text;
    return el;
  }
  g.edges.forEach(e => {
    const [a,b] = e.subjects.map(id => positions[id]);
    const line = element('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#cbd7cc','stroke-width':1.2});
    line.append(element('title',{},`${e.subjects.join(' ↔ ')}: ${e.count} shared student(s)`)); svg.append(line);
  });
  data.subjects.forEach(s => {
    const p = positions[s.id], group = element('g',{});
    group.append(element('title',{},`${s.name}: ${g.sizes[s.id]} students; ${g.adjacency[s.id].size} conflicting subjects; ${assignments[s.id] || 'unscheduled'}`));
    group.append(element('circle',{cx:p.x,cy:p.y,r:25,fill:assignments[s.id] ? color(data,assignments[s.id]) : '#e2e2e2',stroke:'white','stroke-width':4}));
    group.append(element('text',{x:p.x,y:p.y+4,'text-anchor':'middle',fill:'#233633','font-size':Math.min(12,105/s.id.length),'font-weight':650},s.id)); svg.append(group);
  });
  $('graph').replaceChildren(svg);
  $('graph').setAttribute('aria-label',`${n} subjects and ${g.edges.length} conflict edges. ${g.edges.map(e => `${e.subjects.join(' and ')} share ${e.count} students`).join('; ')}. Slot assignments are listed in the timetable.`);
  $('edge-count').textContent = `${n} subjects / ${g.edges.length} connections`;
  $('legend').innerHTML = data.slots.filter(s => r.entries.some(e => e.slot === s.id)).map(s => `<span><i style="background:${color(data,s.id)}"></i>${escapeHTML(s.label)}</span>`).join('') + (r.unscheduled.length ? '<span><i style="background:#e2e2e2"></i>Unscheduled</span>' : '');
}
function renderTimetable(data,r) {
  const subjects = Object.fromEntries(data.subjects.map(s => [s.id,s]));
  const student = data.students.find(s => s.id === $('student-filter').value);
  const visible = new Set(visibleSubjects(data).map(s => s.id));
  const includes = id => visible.has(id);
  const entries = r.entries.filter(e => includes(e.subject)).sort((a,b) => data.slots.findIndex(s => s.id === a.slot)-data.slots.findIndex(s => s.id === b.slot) || a.subject.localeCompare(b.subject));
  const unplaced = r.unscheduled.filter(includes);
  $('student-summary').textContent = student || $('subject-search').value.trim() ? `${entries.length} scheduled · ${unplaced.length} unscheduled` : `${data.students.length} students · ${data.subjects.length} subjects`;
  $('schedule-note').textContent = `${student ? `Student ${student.id}` : 'All students'} · ${entries.length} exams scheduled${unplaced.length ? ` · ${unplaced.length} still need a session` : ''}`;
  $('sessions-view').setAttribute('aria-pressed',String(viewMode === 'sessions'));
  $('table-view').setAttribute('aria-pressed',String(viewMode === 'table'));
  $('export').disabled = !visible.size; $('print').disabled = !visible.size;
  if (!visible.size) {
    $('timetable').innerHTML = '<div class="empty-state"><strong>No subjects match your filters.</strong><p>Try another name or code, or choose Everyone.</p></div>';
    return;
  }
  if (viewMode === 'table') {
    $('timetable').innerHTML = '<table><thead><tr><th>Subject</th><th>When</th><th>Room</th><th>Students</th></tr></thead><tbody>' + entries.map(e => `<tr><td>${escapeHTML(subjects[e.subject].name)}<small>${escapeHTML(e.subject)}</small></td><td><span class="slot-badge" style="background:${color(data,e.slot)}">${escapeHTML(data.slots.find(s => s.id === e.slot).label)}</span></td><td>${escapeHTML(e.room)}</td><td>${e.students}</td></tr>`).join('') + unplaced.map(id => `<tr><td>${escapeHTML(subjects[id].name)}<small>${escapeHTML(id)}</small></td><td><span class="unplaced">Not scheduled</span></td><td>—</td><td>—</td></tr>`).join('') + '</tbody></table>';
  } else {
    $('timetable').innerHTML = '<div class="session-board">' + data.slots.filter(slot => entries.some(e => e.slot === slot.id)).map(slot => {
      const exams = entries.filter(e => e.slot === slot.id);
      return `<section class="session-column"><div class="session-heading" style="border-color:${color(data,slot.id)}"><h3>${escapeHTML(slot.label)}</h3><span>${exams.length} exam${exams.length === 1 ? '' : 's'}</span></div>${exams.map(e => {
        const capacity = data.rooms.find(room => room.id === e.room).capacity;
        return `<article class="exam-card"><span class="exam-code">${escapeHTML(e.subject)}</span><h4>${escapeHTML(subjects[e.subject].name)}</h4><p><strong>${escapeHTML(e.room)}</strong><span>${e.students} students · ${capacity} seats</span></p></article>`;
      }).join('')}</section>`;
    }).join('') + '</div>' + (unplaced.length ? `<section class="unplaced-list"><h3>Not scheduled (${unplaced.length})</h3><p class="tiny">Review the explanations below for the sessions and rooms these exams need.</p>${unplaced.map(id => `<span>${escapeHTML(subjects[id].name)} (${escapeHTML(id)})</span>`).join('')}</section>` : '');
  }
}
function renderDiagnostics(data,result) {
  const issues = ExamEngine.diagnose(data,result);
  $('diagnostics').hidden = !issues.length;
  $('diagnostics').innerHTML = issues.length ? '<h2>Why some exams could not be placed</h2><p class="tiny">Open an exam to see why each session could not be used. Another scheduling method or different earlier choices may still work.</p>' + issues.map(issue => `<details><summary>${escapeHTML(data.subjects.find(s => s.id === issue.subject).name)} (${escapeHTML(issue.subject)}) · ${issue.students} students</summary><ul>${issue.slots.map(slot => `<li><strong>${escapeHTML(slot.label)}</strong><br>${escapeHTML(slot.reason.replace(/\bslot\b/g,'session'))}</li>`).join('')}</ul></details>`).join('') : '';
}
const editorFields = {
  subjects:[['name','Subject name'],['id','Short subject code'],['unavailable','Sessions this exam cannot use']],
  slots:[['label','Day and time'],['id','Short session code']],
  rooms:[['id','Room name or number'],['capacity','Number of seats'],['unavailable','Sessions this room cannot use']],
  students:[['id','Student roll number'],['subjects','Subjects this student takes']]
};
const editorHelp = {
  subjects:{title:'Subjects',description:'Add each subject that needs an exam. Example: Discrete Mathematics, with the short code DM.'},
  slots:{title:'Exam sessions',description:'A session is one exam time, such as Day 1, 9 AM–12 PM. Add sessions in time order and make sure they do not overlap.'},
  rooms:{title:'Rooms',description:'Enter each available room and how many students it can seat. Each exam uses one room.'},
  students:{title:'Students',description:'Add a student’s roll number, then tick the subjects they take. These selections prevent exam clashes.'}
};
function renderEditorField(kind,index,record,field,label) {
  const inputId = `edit-${kind}-${index}-${field}`;
  if (['subjects','unavailable'].includes(field)) {
    const choices = field === 'subjects' ? editorData.subjects : editorData.slots;
    const selected = record[field] || [];
    const fields = choices.map((choice,option) => `<label class="choice"><input type="checkbox" data-kind="${kind}" data-index="${index}" data-field="${field}" data-option="${option}" value="${escapeHTML(choice.id)}" ${selected.includes(choice.id) ? 'checked' : ''}><span>${escapeHTML(field === 'subjects' ? `${choice.name} (${choice.id})` : choice.label)}</span></label>`).join('');
    const missing = selected.filter(id => !choices.some(choice => choice.id === id));
    const missingFields = missing.map(id => `<label class="choice missing-choice"><input type="checkbox" data-kind="${kind}" data-index="${index}" data-field="${field}" value="${escapeHTML(id)}" checked><span>Missing code: ${escapeHTML(id)} — untick to remove</span></label>`).join('');
    const group = `<div class="choice-list" role="group" aria-label="${escapeHTML(label)}">${fields || '<p class="tiny">Add ' + (field === 'subjects' ? 'subjects' : 'exam sessions') + ' first.</p>'}${missingFields}</div>`;
    return field === 'unavailable' ? `<details class="availability"><summary>Unavailable sessions (optional)</summary><p class="tiny">Tick only the sessions this ${kind === 'rooms' ? 'room' : 'exam'} cannot use. Leave all unticked if it is always available.</p>${group}</details>` : `<p class="field-label">${label}</p>${group}`;
  }
  const hint = field === 'capacity' ? 'Count seats, not rooms. Example: 40.' : field === 'name' ? 'Example: Discrete Mathematics' : field === 'label' ? 'Example: Day 1 · 09:00–12:00' : kind === 'students' ? 'Example: S01 or your college roll number' : kind === 'rooms' ? 'Example: Room 101 or LAB1' : kind === 'slots' ? 'Example: D1-AM. Give each session a different code.' : 'Example: DM. Give each subject a different code.';
  return `<label for="${inputId}">${label}</label><input id="${inputId}" aria-describedby="${inputId}-help" data-kind="${kind}" data-index="${index}" data-field="${field}" type="${field === 'capacity' ? 'number' : 'text'}" ${field === 'capacity' ? 'min="1" step="1"' : ''} value="${escapeHTML(record[field] ?? '')}"><small id="${inputId}-help" class="input-help">${hint}</small>`;
}
function renderEditor() {
  if (!editorData) return;
  const expanded = new Set([...$('editor').children].filter(group => group.open).map(group => group.dataset.collection));
  $('dataset-count').textContent = `${editorData.subjects.length} subjects`;
  $('editor').innerHTML = Object.entries(editorFields).map(([kind,fields],step) => `<details class="editor-group" data-collection="${kind}" ${expanded.has(kind) ? 'open' : ''}><summary><span>${step+1}. ${editorHelp[kind].title}</span><span class="pill">${editorData[kind].length}</span></summary><p class="collection-help">${editorHelp[kind].description}</p><div class="editor-records">${editorData[kind].map((record,index) => `<details class="editor-record"><summary>${escapeHTML(kind === 'subjects' ? record.name || record.id : kind === 'slots' ? record.label || record.id : record.id || 'New entry')}</summary><fieldset><legend class="sr-only">${escapeHTML(kind === 'subjects' ? record.name || record.id : kind === 'slots' ? record.label || record.id : record.id || 'New entry')}</legend>${fields.map(([field,label]) => renderEditorField(kind,index,record,field,label)).join('')}<button class="remove-record" type="button" data-action="remove" data-kind="${kind}" data-index="${index}" aria-label="Remove ${escapeHTML(record.id || kind)}">Remove this ${kind === 'subjects' ? 'subject' : kind === 'students' ? 'student' : kind === 'rooms' ? 'room' : 'session'}</button></fieldset></details>`).join('')}</div><button class="secondary add-record" type="button" data-action="add" data-kind="${kind}">+ Add ${kind === 'subjects' ? 'subject' : kind === 'students' ? 'student' : kind === 'rooms' ? 'room' : 'exam session'}</button></details>`).join('');
}
function commitEditor() {
  $('data').value = JSON.stringify(editorData,null,2);
  saveDraft();
  clearResults();
  const errors = ExamEngine.validate(editorData);
  message(errors.length ? `Please complete your details:\n${explainErrors(editorData,errors)}` : 'Details updated. Select Create timetable to see the new schedule.', 'warning');
  $('dataset-count').textContent = `${editorData.subjects.length} subjects`;
}
// Preserve text that has not yet lost focus, without normalizing or disrupting typing.
$('editor').addEventListener('input',event => {
  const {kind,index,field} = event.target.dataset;
  if (!editorData || event.target.type === 'checkbox' || !editorFields[kind]?.some(([key]) => key === field)) return;
  const draft = JSON.parse(JSON.stringify(editorData)), record = draft[kind][Number(index)];
  if (!record) return;
  const oldId = record.id;
  record[field] = field === 'capacity' ? Number(event.target.value) : event.target.value;
  if (field === 'id' && oldId !== record.id) {
    if (kind === 'subjects') draft.students.forEach(s => { s.subjects = s.subjects.map(id => id === oldId ? record.id : id); });
    if (kind === 'slots') [...draft.rooms,...draft.subjects].forEach(r => { if(r.unavailable) r.unavailable = r.unavailable.map(id => id === oldId ? record.id : id); });
  }
  saveDraft(JSON.stringify(draft,null,2));
});
$('editor').addEventListener('change',event => {
  const {kind,index,field} = event.target.dataset;
  if (!editorData || !editorFields[kind] || !editorFields[kind].some(([key]) => key === field)) return;
  const record = editorData[kind][Number(index)]; if (!record) return;
  const oldId = record.id;
  if (event.target.type === 'checkbox') {
    const values = new Set(record[field] || []);
    if (event.target.checked) values.add(event.target.value); else values.delete(event.target.value);
    record[field] = [...values];
  } else record[field] = ['subjects','unavailable'].includes(field) ? event.target.value.split(',').map(s => s.trim()).filter(Boolean) : field === 'capacity' ? Number(event.target.value) : event.target.value.trim();
  // Keep references intact when an existing subject or slot is renamed.
  if (field === 'id' && oldId !== record.id) {
    if (kind === 'subjects') editorData.students.forEach(s => { s.subjects = s.subjects.map(id => id === oldId ? record.id : id); });
    if (kind === 'slots') [...editorData.rooms,...editorData.subjects].forEach(r => { if(r.unavailable) r.unavailable = r.unavailable.map(id => id === oldId ? record.id : id); });
  }
  commitEditor();
  const card = event.target.closest?.('.editor-record');
  if (card) card.querySelector('summary').textContent = kind === 'subjects' ? record.name || record.id : kind === 'slots' ? record.label || record.id : record.id || 'New entry';
  // Update dependent fields without replacing the focused input or a pending click target.
  for (const input of $('editor').querySelectorAll('input[data-kind]')) {
    const ref = editorData[input.dataset.kind][Number(input.dataset.index)];
    const value = ref[input.dataset.field];
    if (input.type === 'checkbox') {
      const choices = input.dataset.field === 'subjects' ? editorData.subjects : editorData.slots;
      const choice = input.dataset.option === undefined ? null : choices[Number(input.dataset.option)];
      if (choice) {
        input.value = choice.id;
        input.nextElementSibling.textContent = input.dataset.field === 'subjects' ? `${choice.name} (${choice.id})` : choice.label;
      }
      input.checked = (value || []).includes(input.value);
    } else input.value = Array.isArray(value) ? value.join(', ') : value ?? '';
  }
});
$('editor').addEventListener('click',event => {
  const {kind,index,action} = event.target.dataset;
  if (!editorData || !editorFields[kind] || !action) return;
  if (action === 'remove') {
    editorData[kind].splice(Number(index),1);
    // References remain visible and validation asks the user to resolve them.
  } else if (action === 'add') {
    const prefix = {subjects:'SUB',students:'STU',rooms:'ROOM',slots:'SLOT'}[kind];
    let number=editorData[kind].length+1;while(editorData[kind].some(r=>r.id===`${prefix}${number}`)) number++;
    const id=`${prefix}${number}`;
    editorData[kind].push(kind === 'subjects' ? {id,name:'New subject'} : kind === 'students' ? {id,subjects:[]} : kind === 'rooms' ? {id,capacity:30} : {id,label:'New session'});
  } else return;
  commitEditor(); renderEditor();
  // Reopen the collection containing the newly added or removed record.
  for (const group of $('editor').children) if (group.dataset.collection === kind) {
    group.open = true;
    if (action === 'add') {
      const added = group.querySelector('.editor-record:last-child');
      if (added) { added.open = true; added.querySelector('input')?.focus(); }
    }
  }
});
$('student-filter').addEventListener('change',() => { if (current) renderTimetable(current.data,current.result); });
$('subject-search').addEventListener('input',() => { if (current) renderTimetable(current.data,current.result); });
for (const [id,view] of [['sessions-view','sessions'],['table-view','table']]) $(id).addEventListener('click',() => { viewMode=view; if (current) renderTimetable(current.data,current.result); saveDraft(); });
function renderComparison(results) {
  $('comparison').innerHTML = ($('algorithm').value === 'auto' ? '<p class="selection-note">Automatic selection: more exams scheduled first, then fewer sessions. An exact tie uses DSATUR. This compares two heuristics and does not guarantee an optimal timetable.</p>' : '') + '<table><thead><tr><th>Algorithm</th><th>Placed</th><th>Slots</th><th>Seat use</th><th>Runtime</th></tr></thead><tbody>' + results.map(r => `<tr class="${r.algorithm === current.result.algorithm ? 'selected-row' : ''}"><td>${r.algorithm === 'dsatur' ? 'DSATUR' : 'Greedy (degree order)'}${r.algorithm === current.result.algorithm ? '<small>Selected approach</small>' : ''}</td><td>${r.entries.length}</td><td>${r.usedSlots}</td><td>${Math.round(r.utilization)}%</td><td>${r.elapsed.toFixed(2)} ms</td></tr>`).join('') + '</tbody></table>';
}
$('demo').addEventListener('click',() => { $('data').value = JSON.stringify(window.DEMO_DATA,null,2); $('subject-search').value=''; $('student-filter').value=''; generate(); });
$('generate').addEventListener('click',generate);
$('algorithm').addEventListener('change',generate);
$('data').addEventListener('input',() => { saveDraft(); clearResults(); editorData=null; $('editor').innerHTML='<p class="tiny">Create a timetable to apply your JSON edits and restore the forms.</p>'; message('Details changed. Create a new timetable to update the results.','warning'); });
$('import').addEventListener('click',() => $('file').click());
$('file').addEventListener('change',async event => {
  const file = event.target.files[0]; if (!file) return;
  try { $('data').value = await file.text(); $('subject-search').value=''; $('student-filter').value=''; saveDraft(); generate(); } catch (e) { clearResults(); message(`Could not read file: ${e.message}`,'error'); }
  event.target.value = '';
});
$('download-data').addEventListener('click',() => {
  try { const data = JSON.parse($('data').value); const errors = ExamEngine.validate(data); if (errors.length) throw new Error(errors.join('\n')); download('exam-data.json',JSON.stringify(data,null,2),'application/json'); }
  catch(e) { message(e.message,'error'); }
});
$('export').addEventListener('click',() => {
  if (!current) return;
  const {data,result} = current;
  const cell = value => '"'+String(value).replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
  const rows = [['Subject ID','Subject name','Slot ID','Slot','Room','Students','Status'],...visibleSubjects(data).map(s => {
    const e = result.entries.find(e => e.subject === s.id);
    return e ? [s.id,s.name,e.slot,data.slots.find(slot => slot.id === e.slot).label,e.room,e.students,'Scheduled'] : [s.id,s.name,'','','','','Unscheduled'];
  })];
  download('exam-timetable.csv','\uFEFF'+rows.map(row => row.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
});
$('print').addEventListener('click',() => window.print());
function boot() {
  let restored = null;
  try {
    const stored = localStorage.getItem(draftKey);
    const draft = stored ? JSON.parse(stored) : null;
    if (draft?.version === 1 && typeof draft.text === 'string') restored = draft;
  } catch (_) { /* Browser storage is optional; the app still works without it. */ }
  $('data').value = restored ? restored.text : JSON.stringify(window.DEMO_DATA,null,2);
  if (restored) {
    $('algorithm').value = ['auto','dsatur','greedy'].includes(restored.algorithm) ? restored.algorithm : 'auto';
    viewMode = restored.view === 'table' ? 'table' : 'sessions';
  }
  generate();
  if (restored && !current) {
    // Incomplete form entries remain editable after reload. Arbitrary JSON stays in the JSON editor.
    try {
      const draft = JSON.parse(restored.text);
      const lists = ['subjects','students','rooms','slots'];
      const editable = draft && lists.every(key => Array.isArray(draft[key]) && draft[key].every(r => r && typeof r.id === 'string')) && draft.subjects.every(r => typeof r.name === 'string' && (r.unavailable === undefined || Array.isArray(r.unavailable))) && draft.students.every(r => Array.isArray(r.subjects)) && draft.rooms.every(r => r.unavailable === undefined || Array.isArray(r.unavailable)) && draft.slots.every(r => typeof r.label === 'string');
      if (editable) { editorData=draft; renderEditor(); }
      else { $('advanced').open=true; $('json-editor').open=true; }
    } catch (_) { $('advanced').open=true; $('json-editor').open=true; }
  }
  if (restored && !$('draft-status').textContent.includes('unavailable')) $('draft-status').textContent='Draft restored from this browser';
}
window.ExamOptSnapshot = () => {
  let data=null, errors=[];
  try { data=JSON.parse($('data').value); errors=ExamEngine.validate(data); }
  catch (_) { errors=['The advanced data is not valid JSON. Fix it or reset to the example.']; }
  return {data,errors,result:current?.result || null};
};
boot();

