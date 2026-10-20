import {build} from 'esbuild';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createPet} from './pet-model.mjs';

// GLTFExporter uses FileReader for binary blobs; Node supplies Blob but not FileReader.
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
await mkdir('assets',{recursive:true});
const glb=await new GLTFExporter().parseAsync(createPet().pet,{binary:true});
await writeFile('assets/opti.glb',Buffer.from(glb));
await copyFile('node_modules/three/LICENSE','assets/THREE-LICENSE.txt');
await build({entryPoints:['pet3d.mjs'],bundle:true,format:'iife',outfile:'pet3d.bundle.js',minify:true,legalComments:'eof',target:'es2022'});
console.log(`Built local 3D viewer and Opti GLB (${glb.byteLength} bytes).`);
