'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const E=require('../engine.js');
const sample=require('../sample.json');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const key='examopt.draft.v1';
function harness(storage=new Map()) {
  const elements=new Map();
  function element(){return {value:'',textContent:'',innerHTML:'',children:[],events:{},attrs:{},querySelectorAll(){return [];},addEventListener(n,f){this.events[n]=f;},replaceChildren(...v){this.children=v;this.innerHTML='';},append(v){this.children.push(v);},setAttribute(k,v){this.attrs[k]=v;}};}
  for(const m of html.matchAll(/id="([^"]+)"/g)) elements.set(m[1],element());
  elements.get('algorithm').value='auto';
  const localStorage=storage instanceof Map ? {getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)} : storage;
  const context={console,performance,setTimeout,ExamEngine:E,localStorage,window:{DEMO_DATA:sample},document:{getElementById:id=>{assert.ok(elements.has(id),id);return elements.get(id);},createElementNS:()=>({...element(),namespaceURI:'http://www.w3.org/2000/svg'})}};
  vm.createContext(context);vm.runInContext(source,context);
  vm.runInContext('download=(name,text,type)=>{globalThis.downloaded={name,text,type};}',context);
  return {elements,context,storage};
}
let app=harness(), get=id=>app.elements.get(id);
assert.match(get('timetable').innerHTML,/session-board/);
assert.match(get('timetable').innerHTML,/Room|R101/);
get('table-view').events.click();assert.match(get('timetable').innerHTML,/<table>/);
assert.equal(get('table-view').attrs['aria-pressed'],'true');
get('subject-search').value='discrete';get('subject-search').events.input();
assert.match(get('timetable').innerHTML,/Discrete Mathematics/);
assert.doesNotMatch(get('timetable').innerHTML,/Environmental Studies/);
get('export').events.click();assert.equal(app.context.downloaded.text.split('\r\n').length,2);
get('student-filter').value='S05';get('student-filter').events.change();
assert.match(get('timetable').innerHTML,/No subjects match/);assert.equal(get('export').disabled,true);
get('subject-search').value='';get('subject-search').events.input();assert.equal(get('export').disabled,false);
get('sessions-view').events.click();assert.match(get('timetable').innerHTML,/session-board/);
// Input events protect uncommitted text, before the field loses focus.
get('editor').events.input({target:{type:'text',dataset:{kind:'subjects',index:'0',field:'name'},value:'My renamed subject '}});
assert.equal(JSON.parse(JSON.parse(app.storage.get(key)).text).subjects[0].name,'My renamed subject ');
app=harness(app.storage);get=id=>app.elements.get(id);
assert.match(get('timetable').innerHTML,/My renamed subject/);
assert.match(get('draft-status').textContent,/restored/);
// A six-vertex crown graph: degree-ordered greedy uses three slots, DSATUR two.
const ids=['A1','A2','B1','B2','C1','C2'];
const crown={subjects:ids.map(id=>({id,name:id})),students:[],rooms:ids.map(id=>({id:`R${id}`,capacity:10})),slots:[{id:'T0',label:'Morning'},{id:'T1',label:'Afternoon'}]};
for(const a of ids.filter(id=>id.endsWith('1'))) for(const b of ids.filter(id=>id.endsWith('2'))) if(a[0]!==b[0]) crown.students.push({id:`${a}${b}`,subjects:[a,b]});
assert.ok(E.schedule(crown,'greedy').unscheduled.length>0);assert.equal(E.schedule(crown,'dsatur').unscheduled.length,0);
get('data').value=JSON.stringify(crown);get('algorithm').value='auto';get('student-filter').value='';get('generate').events.click();
assert.match(get('message').textContent,/All exams scheduled/);
assert.match(get('comparison').innerHTML,/DSATUR<small>Selected approach/);
assert.match(get('comparison').innerHTML,/Automatic selection/);
// A partial form draft restores its controls, allowing the missing enrolment to be fixed.
const incomplete=structuredClone(sample);incomplete.students.push({id:'NEW',subjects:[]});
app=harness(new Map([[key,JSON.stringify({version:1,text:JSON.stringify(incomplete),algorithm:'auto'})]]));get=id=>app.elements.get(id);
assert.match(get('editor').innerHTML,/NEW/);assert.equal(get('export').disabled,true);
get('editor').events.change({target:{type:'checkbox',checked:true,dataset:{kind:'students',index:'12',field:'subjects'},value:'DM'}});
get('generate').events.click();assert.match(get('message').textContent,/All exams scheduled/);
app=harness(new Map([[key,JSON.stringify({version:1,text:'{'})]]));get=id=>app.elements.get(id);
assert.equal(get('json-editor').open,true);assert.match(get('message').textContent,/Invalid JSON/);
app=harness({getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}});get=id=>app.elements.get(id);
assert.match(get('draft-status').textContent,/unavailable/);assert.match(get('message').textContent,/All exams scheduled/);
console.log('Passed: session/table views, search/export consistency, empty filters, automatic method selection, uncommitted draft text, draft recovery and unavailable storage.');
