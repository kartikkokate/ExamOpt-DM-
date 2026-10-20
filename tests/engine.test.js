'use strict';
const assert = require('node:assert/strict');
const E = require('../engine.js');
const sample = require('../sample.json');
const base = (subjects,students,rooms,slots) => ({subjects:subjects.map(id => ({id,name:id})),students:students.map((subjects,i) => ({id:`S${i}`,subjects})),rooms:rooms.map((capacity,i) => ({id:`R${i}`,capacity})),slots:Array.from({length:slots},(_,i) => ({id:`T${i}`,label:`Slot ${i}`}))});
for (const algorithm of ['greedy','dsatur']) {
  const result = E.schedule(sample,algorithm);
  assert.equal(result.unscheduled.length,0);
  assert.deepEqual(E.verify(sample,result),[]);
  assert.equal(result.entries.length,sample.subjects.length);
  const triangle = base(['A','B','C'],[['A','B'],['B','C'],['A','C']],[20,20,20],3);
  assert.equal(E.schedule(triangle,algorithm).usedSlots,3);
  const shortage = E.schedule({...triangle,slots:triangle.slots.slice(0,2)},algorithm);
  assert.equal(shortage.unscheduled.length,1);
  assert.deepEqual(shortage.violations,[]);
  const capacity = base(['A'],[['A'],['A']],[1],2);
  assert.equal(E.schedule(capacity,algorithm).entries.length,0);
  const availability = base(['A'],[['A']],[2],2);
  availability.rooms[0].unavailable = ['T0'];
  assert.equal(E.schedule(availability,algorithm).entries[0].slot,'T1');
  availability.subjects[0].unavailable = ['T1'];
  assert.equal(E.schedule(availability,algorithm).unscheduled.length,1);
}
// Matching must reassign the flexible exam to make room for the constrained exam.
const matching = base(['A','B'],[['A'],['B']],[1,2],1);
assert.deepEqual(E.matchRooms(['A','B'],'T0',matching,{A:1,B:2}),{A:'R0',B:'R1'});
assert.equal(E.matchRooms(['A','B'],'T0',matching,{A:2,B:2}),null);
const duplicate = structuredClone(sample); duplicate.subjects.push(duplicate.subjects[0]);
assert.ok(E.validate(duplicate).some(s => s.includes('Duplicate')));
assert.throws(() => E.schedule(duplicate));
const badRef = structuredClone(sample); badRef.students[0].subjects.push('UNKNOWN');
assert.ok(E.validate(badRef).length);
assert.ok(E.validate(null).length);
const invalid = base(['A','B'],[['A','B']],[2],2);
assert.ok(E.verify(invalid,{entries:[{subject:'A',room:'R0',slot:'T0'},{subject:'B',room:'R0',slot:'T0'}]}).some(s => s.includes('clash')));
const small = base(['A'],[['A'],['A']],[1],1);
assert.match(E.diagnose(small,E.schedule(small))[0].slots[0].reason,/No available room has 2 seats/);
const competing = base(['A','B'],[['A'],['B']],[2],1);
assert.match(E.diagnose(competing,E.schedule(competing))[0].slots[0].reason,/cannot cover all exams/);
const clash = base(['A','B'],[['A','B']],[2,2],1);
assert.match(E.diagnose(clash,E.schedule(clash))[0].slots[0].reason,/Student conflicts/);
small.subjects[0].unavailable=['T0'];
assert.match(E.diagnose(small,E.schedule(small))[0].slots[0].reason,/subject is unavailable/);
assert.deepEqual(E.diagnose(sample,E.schedule(sample)),[]);
// Repeatable generated cases exercise correctness over varied conflict graphs.
let seed = 1307;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<60;i++) {
  const ids=Array.from({length:8},(_,j)=>`C${j}`);
  const students=ids.map(id=>[id]);
  for(let j=0;j<18;j++) students.push(ids.filter(()=>random()<.35));
  const data=base(ids,students.filter(s=>s.length),[50,50,50],8);
  for(const a of ['greedy','dsatur']) {
    const r=E.schedule(data,a);assert.equal(r.unscheduled.length,0);assert.deepEqual(E.verify(data,r),[]);
  }
}
console.log('Passed: demo, triangle, partial schedules, capacity, availability, matching, validation, tamper detection, and 120 generated schedules.');
