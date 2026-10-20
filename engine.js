(function (root) {
  'use strict';
  function validate(data) {
    const errors = [];
    if (!data || typeof data !== 'object') return ['Input must be a JSON object.'];
    for (const key of ['subjects', 'students', 'rooms', 'slots']) {
      if (!Array.isArray(data[key]) || !data[key].length) errors.push(`${key} must be a nonempty array.`);
    }
    if (errors.length) return errors;
    for (const key of ['subjects', 'students', 'rooms', 'slots']) {
      const seen = new Set();
      data[key].forEach((item, i) => {
        if (!item || typeof item !== 'object') { errors.push(`${key}[${i}] must be an object.`); return; }
        if (typeof item.id !== 'string' || !item.id.trim()) errors.push(`${key}[${i}] needs a string id.`);
        else if (seen.has(item.id)) errors.push(`Duplicate ${key} id: ${item.id}.`);
        seen.add(item.id);
      });
    }
    if (errors.length) return errors;
    const subjects = new Set(data.subjects.map(s => s.id));
    const slots = new Set(data.slots.map(s => s.id));
    data.subjects.forEach(s => {
      if (typeof s.name !== 'string' || !s.name.trim()) errors.push(`Subject ${s.id} needs a name.`);
      if (s.unavailable !== undefined && (!Array.isArray(s.unavailable) || s.unavailable.some(id => !slots.has(id)))) errors.push(`Subject ${s.id} has invalid unavailable slots.`);
    });
    data.students.forEach(s => {
      if (!Array.isArray(s.subjects) || !s.subjects.length || s.subjects.some(id => !subjects.has(id)) || new Set(s.subjects).size !== s.subjects.length) errors.push(`Student ${s.id} needs unique, known subject IDs.`);
    });
    data.rooms.forEach(r => {
      if (!Number.isInteger(r.capacity) || r.capacity < 1) errors.push(`Room ${r.id} needs a positive integer capacity.`);
      if (r.unavailable !== undefined && (!Array.isArray(r.unavailable) || r.unavailable.some(id => !slots.has(id)))) errors.push(`Room ${r.id} has invalid unavailable slots.`);
    });
    data.slots.forEach(s => { if (typeof s.label !== 'string' || !s.label.trim()) errors.push(`Slot ${s.id} needs a label.`); });
    const enrolled = new Set(data.students.flatMap(s => s.subjects));
    data.subjects.forEach(s => { if (!enrolled.has(s.id)) errors.push(`Subject ${s.id} has no enrolled students.`); });
    return errors;
  }
  function graph(data) {
    const adjacency = Object.fromEntries(data.subjects.map(s => [s.id, new Set()]));
    const sizes = Object.fromEntries(data.subjects.map(s => [s.id, 0]));
    const shared = {};
    for (const student of data.students) {
      for (const id of student.subjects) sizes[id]++;
      for (let i = 0; i < student.subjects.length; i++) for (let j = i + 1; j < student.subjects.length; j++) {
        const [a, b] = [student.subjects[i], student.subjects[j]].sort();
        adjacency[a].add(b); adjacency[b].add(a);
        const key = JSON.stringify([a, b]);
        shared[key] = (shared[key] || 0) + 1;
      }
    }
    const edges = Object.entries(shared).map(([key, count]) => ({ subjects: JSON.parse(key), count }));
    return { adjacency, sizes, edges };
  }
  // Augmenting-path bipartite matching: exams on the left, eligible rooms on the right.
  function matchRooms(ids, slot, data, sizes) {
    const eligible = Object.fromEntries(ids.map(id => [id, data.rooms.filter(r => r.capacity >= sizes[id] && !(r.unavailable || []).includes(slot)).sort((a,b) => a.capacity-b.capacity || a.id.localeCompare(b.id)).map(r => r.id)]));
    const owner = new Map();
    function augment(id, visited) {
      for (const room of eligible[id]) {
        if (visited.has(room)) continue;
        visited.add(room);
        if (!owner.has(room) || augment(owner.get(room), visited)) { owner.set(room, id); return true; }
      }
      return false;
    }
    for (const id of [...ids].sort((a,b) => eligible[a].length-eligible[b].length || sizes[b]-sizes[a])) {
      if (!augment(id, new Set())) return null;
    }
    return Object.fromEntries([...owner].map(([room, id]) => [id, room]));
  }
  function schedule(data, algorithm = 'dsatur') {
    const errors = validate(data);
    if (errors.length) throw new Error(errors.join('\n'));
    if (!['dsatur', 'greedy'].includes(algorithm)) throw new Error('Unknown scheduling algorithm.');
    const start = performance.now();
    const g = graph(data), assigned = Object.create(null), rooms = Object.create(null), unscheduled = [];
    const groups = Object.fromEntries(data.slots.map(s => [s.id, []]));
    const remaining = new Set(data.subjects.map(s => s.id));
    const byId = Object.fromEntries(data.subjects.map(s => [s.id, s]));
    while (remaining.size) {
      const saturation = id => new Set([...g.adjacency[id]].map(n => assigned[n]).filter(Boolean)).size;
      const order = [...remaining].sort((a,b) => (algorithm === 'dsatur' ? saturation(b)-saturation(a) : 0) || g.adjacency[b].size-g.adjacency[a].size || a.localeCompare(b));
      const id = order[0]; remaining.delete(id);
      let placed = false;
      for (const slot of data.slots) {
        if ((byId[id].unavailable || []).includes(slot.id)) continue;
        if (groups[slot.id].some(other => g.adjacency[id].has(other))) continue;
        const matching = matchRooms([...groups[slot.id], id], slot.id, data, g.sizes);
        if (!matching) continue;
        groups[slot.id].push(id); assigned[id] = slot.id;
        Object.assign(rooms, matching); placed = true; break;
      }
      if (!placed) unscheduled.push(id);
    }
    const entries = data.subjects.filter(s => assigned[s.id]).map(s => ({ subject: s.id, slot: assigned[s.id], room: rooms[s.id], students: g.sizes[s.id] }));
    const usedSlots = data.slots.filter(s => groups[s.id].length).length;
    const occupied = entries.reduce((n,e) => n + e.students, 0);
    const capacity = entries.reduce((n,e) => n + data.rooms.find(r => r.id === e.room).capacity, 0);
    const result = { algorithm, entries, unscheduled, usedSlots, utilization: capacity ? occupied/capacity*100 : 0, elapsed: performance.now()-start };
    result.violations = verify(data, result);
    return result;
  }
  // Independent check of the produced assignment against the input constraints.
  function verify(data, result) {
    const errors = [], exams = new Map(), occupied = new Set();
    for (const e of result.entries) {
      const s = data.subjects.find(s => s.id === e.subject), r = data.rooms.find(r => r.id === e.room);
      if (!s || !r || !data.slots.some(s => s.id === e.slot)) { errors.push('Unknown assignment reference.'); continue; }
      if (exams.has(e.subject)) errors.push(`Duplicate exam ${e.subject}.`);
      exams.set(e.subject, e);
      const key = JSON.stringify([e.slot, e.room]);
      if (occupied.has(key)) errors.push(`Room ${e.room} is double-booked.`);
      occupied.add(key);
      const count = data.students.filter(student => student.subjects.includes(e.subject)).length;
      if (r.capacity < count) errors.push(`Capacity exceeded for ${e.subject}.`);
      if ((s.unavailable || []).includes(e.slot) || (r.unavailable || []).includes(e.slot)) errors.push(`Unavailable slot used for ${e.subject}.`);
    }
    for (const student of data.students) {
      const seen = new Set();
      for (const id of student.subjects) if (exams.has(id)) {
        const slot = exams.get(id).slot;
        if (seen.has(slot)) errors.push(`Student ${student.id} has an exam clash.`);
        seen.add(slot);
      }
    }
    return errors;
  }
  function diagnose(data,result) {
    const g = graph(data);
    return result.unscheduled.map(id => {
      const subject = data.subjects.find(s => s.id === id);
      return { subject:id, students:g.sizes[id], slots:data.slots.map(slot => {
        const group = result.entries.filter(e => e.slot === slot.id).map(e => e.subject);
        const conflicts = group.filter(other => g.adjacency[id].has(other));
        let reason;
        if ((subject.unavailable || []).includes(slot.id)) reason = 'This subject is unavailable in this slot. Change its unavailable slots or add an alternative session.';
        else if (conflicts.length) reason = `Student conflicts with ${conflicts.join(', ')}. Move those exams or add a session.`;
        else {
          const eligible = data.rooms.filter(r => r.capacity >= g.sizes[id] && !(r.unavailable || []).includes(slot.id));
          reason = !eligible.length ? `No available room has ${g.sizes[id]} seats. Increase capacity, change room availability, or add a room.` : !matchRooms([...group,id],slot.id,data,g.sizes) ? 'Eligible rooms cannot cover all exams in this slot. Add a suitable room or move an exam to another session.' : 'This slot is feasible in the final assignment. Try regenerating with a different algorithm.';
        }
        return {slot:slot.id,label:slot.label,reason};
      })};
    });
  }
  root.ExamEngine = { validate, graph, matchRooms, schedule, verify, diagnose };
  if (typeof module !== 'undefined') module.exports = root.ExamEngine;
})(globalThis);
