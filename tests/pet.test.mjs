import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPet} from '../pet-model.mjs';
const {pet,head,beak,rightWing}=createPet();assert.equal(pet.isGroup,true);assert.equal(head.isGroup,true);assert.equal(rightWing.isGroup,true);assert.equal(beak.parent,head);
let meshes=0;pet.traverse(object=>{if(object.isMesh){meshes++;assert.ok(object.geometry.attributes.position.count>0);assert.ok(object.material.isMeshStandardMaterial);}});assert.ok(meshes>0);assert.ok(pet.getObjectByName('Body'));assert.ok(pet.getObjectByName('Left eye'));assert.ok(pet.getObjectByName('Right eye'));
const glb=await readFile(new URL('../assets/opti.glb',import.meta.url));assert.equal(glb.readUInt32LE(0),0x46546c67);assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);
const jsonLength=glb.readUInt32LE(12);const data=JSON.parse(glb.subarray(20,20+jsonLength).toString('utf8'));assert.equal(data.meshes.length,meshes);assert.ok(data.buffers[0].byteLength>0);assert.ok(!data.buffers[0].uri);
console.log('Passed: real 3D mesh hierarchy, material assignments and self-contained glTF 2 binary model.');
