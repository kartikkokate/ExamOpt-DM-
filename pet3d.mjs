import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createPet} from './pet-model.mjs';

let scene,camera,renderer,controls,model,frame=0,visible=false,animate=true,talking=false,mood='ready',waveUntil=0,observer;
const host=document.getElementById('pet-viewport'),note=document.getElementById('pet-render-status');
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
function render(){if(renderer && visible)renderer.render(scene,camera);}
function size(){if(!renderer)return;const w=host.clientWidth||280,h=host.clientHeight||245;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);render();}
function init(){
  if(renderer)return true;
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(35,1,.1,30);camera.position.set(3,2.1,4.6);
    scene.add(new THREE.HemisphereLight(0xffffff,0x77836c,2.3));
    const light=new THREE.DirectionalLight(0xfff1d9,3.5);light.position.set(3,5,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);scene.add(light);
    const rim=new THREE.DirectionalLight(0xbbdfcf,2);rim.position.set(-3,2,-2);scene.add(rim);
    model=createPet();scene.add(model.pet);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.93,1,.13,64),new THREE.MeshStandardMaterial({color:0xdce7cf,roughness:.8}));base.position.y=.03;base.receiveShadow=true;scene.add(base);
    controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.1,0);controls.enablePan=false;controls.minDistance=2.7;controls.maxDistance=7;controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI/2;controls.addEventListener('change',render);controls.update();
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);note.textContent='The 3D view lost graphics access. Reload to restore it; chat is still available.';});
    observer=new ResizeObserver(size);observer.observe(host);size();note.textContent='3D model ready · drag to rotate, scroll or pinch to zoom.';return true;
  }catch(_){renderer=null;host.replaceChildren();note.textContent='3D graphics are unavailable on this device. You can download the model and use chat without the pet.';return false;}
}
function resetPose(){if(!model)return;model.pet.position.y=0;model.head.rotation.z=mood==='thinking'?-.13:0;model.rightWing.rotation.z=.18;model.leftWing.rotation.z=-.18;model.beak.scale.y=1;}
function loop(time){
  frame=0;if(!visible||!renderer)return;
  const moving=animate&&!motion.matches&&!document.hidden;
  resetPose();
  if(moving){model.pet.position.y=Math.sin(time*.0018)*.045;model.head.rotation.z=(mood==='thinking'?-.13:0)+Math.sin(time*.0008)*.025;if(time<waveUntil)model.rightWing.rotation.z=-.8+Math.sin(time*.018)*.35;if(talking)model.beak.scale.y=1+Math.abs(Math.sin(time*.015))*.45;}
  render();if(moving)frame=requestAnimationFrame(loop);
}
function update(){cancelAnimationFrame(frame);frame=0;if(visible && init()){size();resetPose();render();if(animate&&!motion.matches&&!document.hidden)frame=requestAnimationFrame(loop);}}
window.ExamOptPet={setState(state){visible=!!state.visible;animate=!!state.animate;mood=state.mood||'ready';update();},setTalking(value){talking=!!value;},wave(){waveUntil=performance.now()+1800;update();}};
document.getElementById('pet-reset').addEventListener('click',()=>{if(controls){controls.reset();camera.position.set(3,2.1,4.6);controls.target.set(0,1.1,0);controls.update();render();}});
document.getElementById('pet-wave').addEventListener('click',()=>window.ExamOptPet.wave());
host.addEventListener('keydown',event=>{if(!model)return;if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();model.pet.rotation.y+=event.key==='ArrowLeft'?-.15:.15;render();}});
motion.addEventListener('change',update);document.addEventListener('visibilitychange',update);
