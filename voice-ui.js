(function(){
  'use strict';
  const el=id=>document.getElementById(id);let lastReply='';
  const state=(name,error)=>{
    const active=['listening','starting'].includes(name);
    el('voice-mic').textContent=active?'Finish speaking':'Use microphone';el('voice-mic').setAttribute('aria-pressed',String(active));
    el('voice-cancel').disabled=!active;el('assistant-send').disabled=active||window.ExamOptCompanion.isBusy();
    if(active)el('voice-status').textContent=name==='starting'?'Requesting microphone access…':'Listening… Speak your question. Select Finish speaking when done.';
    else if(name==='speaking')el('voice-status').textContent='Opti is speaking. Select Stop audio to interrupt.';
    else if(name==='no-speech')el('voice-status').textContent='No speech was recognized. Try again or type your question.';
    else if(name==='error')el('voice-status').textContent=error==='not-allowed'||error==='service-not-allowed'?'Microphone access was denied. Allow it in browser settings, or type your question.':error==='network'?'The browser speech service is unavailable. Check your connection or type your question.':'Voice input could not start. Try again or use typing.';
    else if(name==='unavailable')el('voice-status').textContent='Voice input is unavailable in this browser. You can still type.';
    else if(name==='speech-error'||name==='speech-unavailable')el('voice-status').textContent='Spoken playback is unavailable. The reply remains in the chat.';
    else el('voice-status').textContent='Ready. Type a question or use the microphone.';
    window.ExamOptPet?.setTalking(name==='speaking');
  };
  const voice=ExamOptVoice.create({Recognition:window.SpeechRecognition||window.webkitSpeechRecognition,synthesis:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,onState:state,onTranscript:text=>{el('assistant-question').value=text;},onComplete:text=>{
    el('voice-status').textContent=el('voice-autosend').checked?'Question recognized. Sending to the selected guide mode…':'Question recognized. Review the text, then select Ask Opti.';
    if(el('voice-autosend').checked)window.ExamOptCompanion.ask(text);
  }});
  el('voice-mic').disabled=!voice.canListen;
  el('voice-read').disabled=!voice.canSpeak;el('voice-replay').disabled=true;
  el('voice-mic').addEventListener('click',()=>{if(window.ExamOptCompanion.isBusy())return;if(voice.listening)voice.stop();else voice.start(el('voice-language').value);});
  el('voice-cancel').addEventListener('click',()=>voice.cancel());
  el('voice-stop').addEventListener('click',()=>voice.stopSpeaking());
  el('voice-replay').addEventListener('click',()=>{if(lastReply)voice.speak(lastReply,el('voice-language').value);});
  el('voice-read').addEventListener('change',()=>{if(!el('voice-read').checked)voice.stopSpeaking();});
  window.ExamOptVoiceUI={reply(text){lastReply=text;el('voice-replay').disabled=!voice.canSpeak;if(el('voice-read').checked)voice.speak(text,el('voice-language').value);},stop(){voice.cancel();voice.stopSpeaking();},clear(){voice.cancel();voice.stopSpeaking();lastReply='';el('voice-replay').disabled=true;},get listening(){return voice.listening;}};
  if(!voice.canListen)state('unavailable');else state('idle');
  window.addEventListener('pagehide',()=>window.ExamOptVoiceUI.stop());
})();
