(function(){
  'use strict';
  const el=id=>document.getElementById(id), prefsKey='examopt.companion.v1';
  let busy=false, liveReady=false, chat=[], connectionChecked=false, petTips=0,controller=null;
  const status=text=>{el('assistant-status').textContent=text;};
  function append(role,text){
    const item=document.createElement('div');item.className=`chat-message ${role}`;
    const label=document.createElement('strong');label.textContent=role==='user' ? 'You' : el('assistant-mode').value==='ai' ? 'Opti · AI' : 'Opti · offline guide';
    const body=document.createElement('p');body.textContent=text;item.append(label,body);el('assistant-messages').append(item);
    el('assistant-messages').scrollTop=el('assistant-messages').scrollHeight;
    while(el('assistant-messages').children.length>24)el('assistant-messages').firstElementChild.remove();
  }
  function preferences(){
    try{localStorage.setItem(prefsKey,JSON.stringify({pet:el('pet-enabled').checked,motion:el('pet-motion').checked}));}catch(_){}
  }
  function refresh(){
    const enabled=el('pet-enabled').checked;
    el('pet-zone').hidden=!enabled;el('pet-motion').disabled=!enabled;
    el('pet-zone').classList.toggle('still',!el('pet-motion').checked);
    const snapshot=window.ExamOptSnapshot();
    const mood=snapshot.errors.length ? 'thinking' : !snapshot.result ? 'ready' : snapshot.result.unscheduled.length ? 'thinking' : 'happy';
    el('pet-zone').dataset.mood=mood;
    window.ExamOptPet?.setState({visible:enabled,animate:el('pet-motion').checked,mood:busy?'thinking':mood});
    el('pet-tip').textContent=snapshot.errors.length ? 'A few details need attention. Ask me what to fix first.' : !snapshot.result ? 'Your details changed. Create a new timetable when you’re ready.' : snapshot.result.unscheduled.length ? `${snapshot.result.unscheduled.length} exams need a session. Let’s check their rooms and conflicts.` : 'Your exams are scheduled! Choose a student to check their exam plan.';
  }
  async function checkConnection(){
    if(!/^https?:$/.test(location.protocol)){liveReady=false;connectionChecked=true;return;}
    try{const res=await fetch('/api/status',{signal:AbortSignal.timeout(4000)});if(!res.ok)throw Error();const data=await res.json();liveReady=data.configured===true;}catch(_){liveReady=false;}
    connectionChecked=true;
  }
  async function setMode(){
    window.ExamOptVoiceUI?.clear();
    chat=[];el('assistant-messages').replaceChildren();
    const online=el('assistant-mode').value==='ai';el('assistant-privacy').hidden=!online;
    if(online){status('Checking the AI connection…');await checkConnection();if(el('assistant-mode').value!=='ai')return;status(liveReady ? 'AI connection is configured. Send a message to ask Opti.' : 'AI is not connected. Follow Connect AI chat below, or switch to Offline guide.');}
    else status('Offline guide · built-in guidance using your current timetable. No messages are sent online.');
    append('assistant',online ? 'Ask about your timetable once the server is connected. Your question and a roster-free summary will be sent to the configured AI service.' : 'Hi, I’m Opti. I can explain your result, help with unscheduled exams, or walk through the mathematics. Pick a question below or type your own.');
  }
  async function ask(question){
    question=String(question).trim();if(!question||busy)return;
    if(window.ExamOptVoiceUI?.listening){status('Finish or cancel voice input before sending.');return;}
    if(question.length>2000){status('Keep your question under 2,000 characters.');return;}
    const online=el('assistant-mode').value==='ai';
    append('user',question);el('assistant-question').value='';
    window.ExamOptVoiceUI?.stop();
    if(!online){const reply=ExamOptGuide.answer(question,window.ExamOptSnapshot());append('assistant',reply);window.ExamOptVoiceUI?.reply(reply);return;}
    busy=true;el('assistant-send').disabled=true;el('assistant-mode').disabled=true;el('assistant-clear').disabled=true;el('assistant-stop').hidden=false;status('Opti is thinking…');refresh();controller=new AbortController();
    const timeout=setTimeout(()=>controller?.abort('timeout'),45000);
    try{
      if(!connectionChecked || !liveReady)await checkConnection();
      if(!liveReady)throw Error('AI is not connected. Start the server with a configured AI Gateway key, or switch to Offline guide.');
      const context=ExamOptGuide.summary(window.ExamOptSnapshot());
      if(controller.signal.aborted)throw new DOMException('Stopped','AbortError');
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,history:chat.slice(-8),context}),signal:controller.signal});
      const response=await res.json();if(!res.ok)throw Error(response.error || 'The AI service could not answer.');
      append('assistant',response.text);chat.push({role:'user',content:question},{role:'assistant',content:response.text});chat=chat.slice(-8);
      window.ExamOptVoiceUI?.reply(response.text);
      status('AI reply received. Check suggested changes before applying them yourself.');
    }catch(error){status(controller?.signal.aborted ? controller.signal.reason==='timeout' ? 'The AI request timed out. Try again or use Offline guide.' : 'Reply stopped. You can send another question.' : error.message);}
    finally{clearTimeout(timeout);controller=null;busy=false;el('assistant-send').disabled=false;el('assistant-mode').disabled=false;el('assistant-clear').disabled=false;el('assistant-stop').hidden=true;refresh();}
  }
  el('assistant-form').addEventListener('submit',event=>{event.preventDefault();ask(el('assistant-question').value);});
  for(const [id,q] of [['guide-start','What should I do next?'],['guide-result','Explain my result'],['guide-fix','Help with unscheduled exams'],['guide-math','Explain the mathematics']])el(id).addEventListener('click',()=>ask(q));
  el('assistant-mode').addEventListener('change',setMode);
  el('assistant-clear').addEventListener('click',()=>{window.ExamOptVoiceUI?.clear();chat=[];el('assistant-messages').replaceChildren();status('Chat cleared. Your timetable is unchanged.');});
  el('assistant-stop').addEventListener('click',()=>controller?.abort());
  el('pet-enabled').addEventListener('change',()=>{preferences();refresh();});
  el('pet-motion').addEventListener('change',()=>{preferences();refresh();});
  el('pet-button').addEventListener('click',()=>{const questions=['What should I do next?','Help with unscheduled exams','Explain the mathematics'];ask(questions[petTips++%questions.length]);});
  try{const p=JSON.parse(localStorage.getItem(prefsKey));if(p){el('pet-enabled').checked=p.pet===true;el('pet-motion').checked=p.motion!==false;}}catch(_){}
  // AI mode is deliberately not restored: opening ExamOpt never sends a chat request automatically.
  el('assistant-mode').value='offline';window.ExamOptCompanion={refresh,ask,isBusy:()=>busy};refresh();setMode();
})();
