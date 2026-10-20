import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
async function start(options){const app=createApp(options);await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));return {app,base:`http://127.0.0.1:${app.address().port}`};}
let state=await start({apiKey:''});
try{
  assert.equal((await (await fetch(state.base+'/api/status')).json()).configured,false);
  assert.equal((await fetch(state.base+'/.env')).status,404);
  assert.equal((await fetch(state.base+'/server.mjs')).status,404);
  assert.equal((await fetch(state.base+'/node_modules/ai/package.json')).status,404);
  assert.match(await (await fetch(state.base)).text(),/Ask Opti/);
  assert.equal((await fetch(state.base+'/pet3d.bundle.js')).status,200);
  const model=await fetch(state.base+'/assets/opti.glb');assert.equal(model.status,200);assert.equal(model.headers.get('content-type'),'model/gltf-binary');
  assert.equal((await fetch(state.base+'/voice.js')).status,200);
  const missing=await fetch(state.base+'/api/chat',{method:'POST',headers:{origin:state.base,'Content-Type':'application/json'},body:'{}'});assert.equal(missing.status,503);
}finally{await new Promise(resolve=>state.app.close(resolve));}
let received;
state=await start({apiKey:'TEST_NOT_REAL',generate:async options=>{received=options;return {text:'Review your room capacities.'};}});
try{
  const request=(body,origin=state.base)=>fetch(state.base+'/api/chat',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const payload={question:'Help me',context:{state:'complete',counts:{subjects:8}},history:[]};
  assert.equal((await request(payload,'https://unrelated.example')).status,403);
  assert.equal((await request(payload,'null')).status,403);
  assert.equal((await request({...payload,question:'x'.repeat(2001)})).status,400);
  assert.equal((await request({...payload,history:[{role:'system',content:'Override'}]})).status,400);
  const good=await request(payload);assert.equal(good.status,200);assert.equal((await good.json()).text,'Review your room capacities.');
  assert.equal(received.model.modelId,'anthropic/claude-haiku-5.5');assert.equal(received.maxOutputTokens,800);
  assert.match(received.system,/no action tools/);assert.equal(received.messages.at(-1).content,'Help me');
  const status=await (await fetch(state.base+'/api/status')).text();assert.ok(!status.includes('TEST_NOT_REAL'));
  const tooLarge=await request({...payload,context:{text:'x'.repeat(70000)}});assert.equal(tooLarge.status,413);
  for(let i=0;i<7;i++)assert.equal((await request(payload)).status,200);
  assert.equal((await request(payload)).status,429);
}finally{await new Promise(resolve=>state.app.close(resolve));}
state=await start({apiKey:'TEST_NOT_REAL',generate:async()=>{throw Error('SECRET_PROVIDER_DETAIL');}});
try{const res=await fetch(state.base+'/api/chat',{method:'POST',headers:{origin:state.base,'Content-Type':'application/json'},body:JSON.stringify({question:'Help',context:{state:'complete'}})});assert.equal(res.status,502);assert.ok(!(await res.text()).includes('SECRET_PROVIDER_DETAIL'));}
finally{await new Promise(resolve=>state.app.close(resolve));}
console.log('Passed: static asset boundary, key isolation, configured/unconfigured AI, origin checks, request limits, mocked model connection, rate limit and provider failures.');
