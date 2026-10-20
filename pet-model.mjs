import * as THREE from 'three';

export function createPet(){
  const pet=new THREE.Group();pet.name='Opti the study owl';
  const materials={green:new THREE.MeshStandardMaterial({color:0x32745e,roughness:.48}),light:new THREE.MeshStandardMaterial({color:0x91b98b,roughness:.65}),cream:new THREE.MeshStandardMaterial({color:0xf4efd6,roughness:.6}),gold:new THREE.MeshStandardMaterial({color:0xeeb65e,roughness:.4}),dark:new THREE.MeshStandardMaterial({color:0x122d28,roughness:.25}),white:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.15})};
  function sphere(name,material,position,scale,parent=pet){const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),materials[material]);m.name=name;m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  sphere('Body','green',[0,1.03,0],[.66,.78,.48]);
  sphere('Belly','light',[0,.9,.37],[.43,.48,.14]);
  const head=new THREE.Group();head.name='Head';head.position.set(0,1.63,.02);pet.add(head);
  sphere('Head shape','green',[0,0,0],[.72,.58,.5],head);
  for(const side of [-1,1]){
    const eye=sphere(side<0?'Left eye':'Right eye','cream',[side*.285,.04,.405],[.29,.31,.13],head);
    sphere('Pupil','dark',[side*.285,.045,.53],[.122,.157,.065],head);
    sphere('Eye sparkle','white',[side*.285-.028,.095,.588],[.035,.042,.018],head);
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.18,.4,4),materials.green);ear.name='Ear tuft';ear.position.set(side*.5,.46,-.02);ear.rotation.z=-side*.22;head.add(ear);
    const wing=new THREE.Group();wing.name=side<0?'Left wing':'Right wing';wing.position.set(side*.57,1.25,0);pet.add(wing);
    sphere('Wing feathers','green',[side*.07,-.22,0],[.2,.47,.2],wing);wing.rotation.z=side*.18;
    sphere('Foot','gold',[side*.23,.23,.18],[.22,.115,.27]);
    eye.userData.side=side;
  }
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.115,.25,4),materials.gold);beak.name='Beak';beak.position.set(0,-.15,.61);beak.rotation.x=Math.PI;head.add(beak);
  sphere('Tail','green',[0,.55,-.43],[.26,.2,.28]);
  return {pet,head,beak,leftWing:pet.getObjectByName('Left wing'),rightWing:pet.getObjectByName('Right wing')};
}
