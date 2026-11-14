import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
// Comprobar el JavaScript real de la función, sin el resolvedor permisivo de tsx.
mkdirSync('.revision-local',{recursive:true});
const salida=mkdtempSync(path.resolve('.revision-local/api-esm-'));
try{
 const pasos=[
 ['node_modules/typescript/bin/tsc','--ignoreConfig','--module','nodenext','--moduleResolution','nodenext','--target','ES2022','--jsx','react-jsx','--types','vite/client,node','--esModuleInterop','--skipLibCheck','--outDir',salida,'--rootDir','.','api/index.ts'],
 ['--input-type=module','-e',`const {default:app}=await import(${JSON.stringify(new URL('file://'+path.join(salida,'api/index.js')).href)});if(typeof app!=='function')throw Error('Exportación API inválida');console.log('API ESM compilada y cargada por Node correctamente.');`]
 ];
 for(const args of pasos){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0){process.exitCode=r.status||1;break;}}
}finally{rmSync(salida,{recursive:true,force:true});}
