(function(root){
  'use strict';
  const engine=typeof module!=='undefined' ? require('./engine.js') : root.ExamEngine;
  function summary(snapshot){
    const {data,errors,result}=snapshot;
    if(!data || errors.length) return {state:'needs-data',errors:['Exam details are incomplete or invalid. Ask the user to review validation messages in the local form.']};
    const g=engine.graph(data);
    return {
      state:result ? result.unscheduled.length ? 'partial' : 'complete' : 'needs-generation',
      counts:{subjects:data.subjects.length,students:data.students.length,rooms:data.rooms.length,sessions:data.slots.length},
      subjects:data.subjects.map(s=>({id:s.id,name:s.name,students:g.sizes[s.id],unavailable:s.unavailable || []})),
      rooms:data.rooms.map(r=>({id:r.id,capacity:r.capacity,unavailable:r.unavailable || []})),
      sessions:data.slots.map(s=>({id:s.id,label:s.label})),
      conflicts:g.edges,
      result:result ? {algorithm:result.algorithm,scheduled:result.entries.length,usedSessions:result.usedSlots,seatUtilization:Math.round(result.utilization),unscheduled:result.unscheduled,assignments:result.entries,issues:engine.diagnose(data,result)} : null
    };
  }
  function answer(question,snapshot){
    const q=String(question).toLowerCase(), {data,errors,result}=snapshot;
    if(/math|graph|color|colour|dsatur|greedy|algorithm|bipartite|matching|viva/.test(q)) return 'The subjects form a graph: each subject is a vertex, and a shared student creates an edge. Connected subjects need different sessions (colors). DSATUR selects the subject with the most distinct neighboring session colors; greedy selects by number of neighbors. Bipartite matching assigns each exam a different available room with enough seats. Automatic mode compares both schedules. These are heuristics: they do not guarantee the fewest sessions.';
    if(/save|backup|draft|download|export/.test(q)) return 'Your draft is saved in this browser when storage is available. Download a backup saves a JSON file you can reopen later. Download timetable creates a CSV using the current student and subject filters; it opens in Excel. The pet preference is also stored locally. Chat messages are kept only in this page’s memory.';
    if(/pet|owl|opti|animate/.test(q)) return 'Use Show pet to turn Opti on or off. Animate controls movement; your device’s reduced-motion setting is also respected. Click the owl for a useful next-step tip. Hiding the pet does not disable this guide.';
    if(/\bai\b|connect|key|online|server/.test(q)) return 'The offline guide uses built-in explanations and your current data; it is not a language model. To use live AI chat, follow AI-SETUP.md, run the local server, and select AI chat. Keep the API key on the server. AI mode shares your question and a roster-free timetable summary with the configured AI service.';
    if(errors.length || !data) return `First fix your exam details:\n${errors.slice(0,6).map(e=>'• '+e).join('\n')}\nOpen Subjects, Exam sessions, Rooms and Students to correct the entries. If the advanced JSON cannot be read, correct it there or use Reset to example.`;
    if(!result) return 'Your details are ready to check. Select Create timetable to schedule the exams. Opti only guides you; it does not change your data. Then review any exams that could not be placed.';
    const subject=data.subjects.find(s=>q.includes(s.id.toLowerCase()) && new RegExp(`(^|[^a-z0-9])${s.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z0-9]|$)`,'i').test(question));
    if(subject && /why|conflict|clash|session|when|room/.test(q)) {
      const g=engine.graph(data), adjacent=[...g.adjacency[subject.id]], assigned=result.entries.find(e=>e.subject===subject.id);
      return `${subject.name} (${subject.id}) shares students with ${adjacent.length ? adjacent.join(', ') : 'no other subject'}. ${assigned ? `It is scheduled in ${data.slots.find(s=>s.id===assigned.slot).label}, in room ${assigned.room}.` : 'It is not scheduled in the current result.'} Subjects sharing a student must use different sessions. Room sizes and unavailable sessions also affect placement. The chosen session is a heuristic choice, not proof that every alternative is impossible.`;
    }
    if(/unscheduled|not scheduled|unplaced|fix|cannot|problem/.test(q)) {
      if(!result.unscheduled.length) return 'All exams are scheduled in the current result. Student conflicts, room capacity and availability checks passed. You can select a student to review their exams, then download or print the view.';
      const issues=engine.diagnose(data,result);
      return `${result.unscheduled.length} exam(s) still need a session:\n` + issues.slice(0,4).map(issue=>`${issue.subject} (${issue.students} students):\n`+issue.slots.slice(0,4).map(slot=>`• ${slot.label}: ${slot.reason}`).join('\n')).join('\n\n')+'\nTry Automatic mode, suitable additional rooms, or more non-overlapping sessions. A partial result does not prove the problem is impossible.';
    }
    if(/result|explain|summary|schedule|timetable|next|start|help/.test(q)) return `${result.entries.length} of ${data.subjects.length} exams are scheduled across ${result.usedSlots} sessions using ${result.algorithm === 'dsatur' ? 'DSATUR' : 'greedy'}. Booked rooms have ${Math.round(result.utilization)}% of their seats filled across exam assignments. ${result.unscheduled.length ? `${result.unscheduled.length} exams remain unscheduled: ${result.unscheduled.join(', ')}. Open the explanations below the timetable.` : 'No student clashes were found, and assigned rooms meet capacity and availability checks. Review a student’s timetable, then download it.'}\nTo use your own data, edit Subjects → Exam sessions → Rooms → Students and create the timetable again.`;
    return 'I’m in offline guide mode and can explain the timetable, student conflicts, room sizes, unscheduled exams, saving, or the mathematics. Try “Explain my result”, “Help with unscheduled exams”, or “Why does DM need a different session?”. For open-ended conversation, connect AI chat.';
  }
  root.ExamOptGuide={summary,answer};
  if(typeof module!=='undefined')module.exports=root.ExamOptGuide;
})(globalThis);
