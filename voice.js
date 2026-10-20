(function(root){
  'use strict';
  function create({Recognition,synthesis,Utterance,onState=()=>{},onTranscript=()=>{},onComplete=()=>{}}){
    let recognition=null,listening=false,starting=false,transcript='',cancelled=false,spoken=null,speakSerial=0,session=0;
    function stopSpeaking(){speakSerial++;synthesis?.cancel();spoken=null;onState('silent');}
    function speak(text,lang='en-IN'){
      if(!synthesis||!Utterance){onState('speech-unavailable');return;}
      stopSpeaking();const serial=speakSerial;
      spoken=new Utterance(String(text).slice(0,6000));spoken.lang=lang;spoken.rate=1;
      spoken.onstart=()=>{if(serial===speakSerial)onState('speaking');};
      spoken.onend=()=>{if(serial===speakSerial){spoken=null;onState('silent');}};
      spoken.onerror=()=>{if(serial===speakSerial){spoken=null;onState('speech-error');}};
      synthesis.speak(spoken);
    }
    function cancel(){session++;cancelled=true;starting=false;listening=false;recognition?.abort();onState('idle');}
    function start(lang='en-IN'){
      if(!Recognition){onState('unavailable');return;}
      if(starting||listening)return;
      stopSpeaking();transcript='';cancelled=false;starting=true;
      const current=++session;
      recognition=new Recognition();recognition.lang=lang;recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
      recognition.onstart=()=>{if(current!==session||cancelled)return;starting=false;listening=true;onState('listening');};
      recognition.onresult=event=>{
        if(current!==session||cancelled)return;
        let final='',interim='';for(let i=0;i<event.results.length;i++){const text=event.results[i][0].transcript;if(event.results[i].isFinal)final+=text+' ';else interim+=text+' ';}
        transcript=final.trim();onTranscript((final+interim).trim(),!!transcript);
      };
      recognition.onerror=event=>{if(current!==session||cancelled)return;cancelled=true;listening=false;starting=false;onState('error',event.error);};
      recognition.onend=()=>{if(current!==session)return;listening=false;starting=false;if(!cancelled){onState('idle');if(transcript)onComplete(transcript);else onState('no-speech');}};
      try{onState('starting');recognition.start();}catch(_){starting=false;cancelled=true;onState('error','start-failed');}
    }
    return {start,cancel,stop(){if(listening||starting)recognition?.stop();},speak,stopSpeaking,get listening(){return listening||starting;},get canListen(){return !!Recognition;},get canSpeak(){return !!synthesis&&!!Utterance;}};
  }
  root.ExamOptVoice={create};if(typeof module!=='undefined')module.exports=root.ExamOptVoice;
})(globalThis);
