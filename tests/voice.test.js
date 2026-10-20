'use strict';
const assert=require('node:assert/strict');
const Voice=require('../voice.js');
let latest,states=[],completed=[],transcripts=[],spoken;
class Recognition{constructor(){latest=this;}start(){}stop(){this.stopped=true;}abort(){this.aborted=true;}}
class Utterance{constructor(text){this.text=text;}}
const synthesis={cancel(){this.cancelled=true;},speak(value){spoken=value;value.onstart();}};
const voice=Voice.create({Recognition,synthesis,Utterance,onState:(...state)=>states.push(state),onTranscript:text=>transcripts.push(text),onComplete:text=>completed.push(text)});
voice.start('hi-IN');assert.equal(latest.lang,'hi-IN');assert.equal(voice.listening,true);
latest.onstart();const interim=[{transcript:'explain my'}];interim.isFinal=false;latest.onresult({results:[interim]});assert.equal(transcripts.at(-1),'explain my');
const final=[{transcript:'explain my timetable'}];final.isFinal=true;latest.onresult({results:[final]});latest.onend();assert.deepEqual(completed,['explain my timetable']);
voice.start();const old=latest;voice.cancel();assert.equal(old.aborted,true);old.onend();assert.equal(completed.length,1);
voice.start();old.onresult({results:[final]});old.onend();assert.equal(voice.listening,true);assert.equal(completed.length,1);
latest.onerror({error:'not-allowed'});latest.onend();assert.deepEqual(states.at(-1),['error','not-allowed']);
voice.speak('Hello','en-IN');assert.equal(spoken.text,'Hello');assert.equal(spoken.lang,'en-IN');assert.equal(states.at(-1)[0],'speaking');
voice.stopSpeaking();assert.equal(synthesis.cancelled,true);assert.equal(states.at(-1)[0],'silent');
const unsupported=Voice.create({onState:(...state)=>states.push(state)});unsupported.start();assert.equal(states.at(-1)[0],'unavailable');
console.log('Passed: voice transcript, final-only completion, languages, cancel, stale events, permission failure, speech playback and unsupported browsers.');
