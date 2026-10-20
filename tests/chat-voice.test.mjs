import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),E=require('../engine.js'),Guide=require('../assistant-core.js'),Voice=require('../voice.js'),data=require('../sample.json');
const elements=new Map();
function element(){return {value:'',checked:false,children:[],events:{},dataset:{},classList:{toggle(){}},addEventListener(k,v){this.events[k]=v;},append(...v){this.children.push(...v);},replaceChildren(){this.children=[];},setAttribute(){}};}
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const m of html.matchAll(/id="([^"]+)"/g))elements.set(m[1],element());
elements.get('voice-language').value='en-IN';
let recognizer,spoken,request;
class Recognition{constructor(){recognizer=this;}start(){this.onstart();}stop(){this.onend();}abort(){}}
class Utterance{constructor(text){this.text=text;}}
const window={ExamOptSnapshot:()=>({data,errors:[],result:E.schedule(data)}),SpeechRecognition:Recognition,SpeechSynthesisUtterance:Utterance,speechSynthesis:{cancel(){},speak(value){spoken=value;value.onstart();}},addEventListener(){}};
const context={window,location:{protocol:'http:'},AbortController,AbortSignal,DOMException,setTimeout,clearTimeout,ExamOptGuide:Guide,ExamOptVoice:Voice,localStorage:{getItem(){return null;},setItem(){}},document:{getElementById:id=>elements.get(id),createElement:()=>element()},fetch:async(url,options)=>{
  if(url==='/api/status')return {ok:true,json:async()=>({configured:true})};
  request=JSON.parse(options.body);return {ok:true,json:async()=>({text:'Your exams are scheduled. Review the student timetable.'})};
}};
vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../companion.js',import.meta.url),'utf8'),context);vm.runInContext(fs.readFileSync(new URL('../voice-ui.js',import.meta.url),'utf8'),context);
elements.get('assistant-mode').value='ai';await elements.get('assistant-mode').events.change();
elements.get('voice-read').checked=true;elements.get('voice-autosend').checked=true;
elements.get('voice-mic').events.click();assert.equal(recognizer.lang,'en-IN');
const result=[{transcript:'Explain my result'}];result.isFinal=true;recognizer.onresult({results:[result]});recognizer.onend();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(request.question,'Explain my result');assert.equal(request.context.counts.students,12);assert.ok(!JSON.stringify(request.context).includes('S01'));
assert.equal(spoken.text,'Your exams are scheduled. Review the student timetable.');
assert.match(elements.get('assistant-messages').children.at(-1).children[1].textContent,/exams are scheduled/);
elements.get('voice-autosend').checked=false;request=null;elements.get('voice-mic').events.click();recognizer.onresult({results:[result]});recognizer.onend();
await new Promise(resolve=>setImmediate(resolve));assert.equal(request,null);assert.equal(elements.get('assistant-question').value,'Explain my result');
await window.ExamOptCompanion.ask(elements.get('assistant-question').value);assert.equal(request.question,'Explain my result');assert.equal(request.history.length,2);
elements.get('voice-mic').events.click();recognizer.onerror({error:'not-allowed'});assert.match(elements.get('voice-status').textContent,/denied/);assert.equal(elements.get('assistant-send').disabled,false);
elements.get('assistant-clear').events.click();assert.equal(elements.get('assistant-messages').children.length,0);assert.equal(elements.get('voice-replay').disabled,true);
console.log('Passed: voice → transcript → live-chat API → spoken reply, transcript review before sending, typed follow-ups with history, permission failure and clear chat.');
