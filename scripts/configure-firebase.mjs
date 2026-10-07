import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {getFirebaseAdminApp} from '../src/lib/firebase/admin.ts';
if(!process.argv.includes('--apply'))throw new Error('Pass --apply to deploy checked Firestore rules/indexes and enable email-link sign-in.');
if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw new Error('Use cloud credentials for configuration.');
const app=getFirebaseAdminApp(),project=app.options.projectId;
const {access_token}=await app.options.credential.getAccessToken();
async function request(url,method='GET',body) {
  const response=await fetch(url,{method,headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok)throw Object.assign(new Error('Cloud configuration request failed'),{code:data.error?.status,status:response.status});
  return data;
}
try {
  const configUrl=`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`;
  const current=await request(configUrl);
  if(!current.authorizedDomains?.includes('aiguidepage.vercel.app'))await request(`${configUrl}?updateMask=authorizedDomains`,'PATCH',{authorizedDomains:[...(current.authorizedDomains||[]),'aiguidepage.vercel.app']});
  if(!current.signIn?.email?.enabled||current.signIn.email.passwordRequired!==false)await request(`${configUrl}?updateMask=signIn.email.enabled,signIn.email.passwordRequired`,'PATCH',{signIn:{email:{enabled:true,passwordRequired:false}}});
  console.log('Authentication: deployment domain and email-link sign-in configured.');
  const rulesUrl=`https://firebaserules.googleapis.com/v1/projects/${project}`;
  await mkdir('.cache',{recursive:true});
  let releaseExists=false;
  try {
    const previous=await request(`${rulesUrl}/releases/cloud.firestore`);releaseExists=true;
    const ruleset=await request(`https://firebaserules.googleapis.com/v1/${previous.rulesetName}`);
    await writeFile('.cache/firestore-rules-backup.json',JSON.stringify(ruleset.source));
  } catch(error) {if(error.status!==404)throw error;}
  const ruleset=await request(`${rulesUrl}/rulesets`,'POST',{source:{files:[{name:'firestore.rules',content:await readFile('firestore.rules','utf8')}]}});
  if(releaseExists)await request(`${rulesUrl}/releases/cloud.firestore`,'PATCH',{release:{name:`projects/${project}/releases/cloud.firestore`,rulesetName:ruleset.name},updateMask:'rulesetName'});
  else await request(`${rulesUrl}/releases`,'POST',{name:`projects/${project}/releases/cloud.firestore`,rulesetName:ruleset.name});
  console.log('Firestore: security rules deployed; previous rules saved locally.');
  const indexes=JSON.parse(await readFile('firestore.indexes.json','utf8')).indexes;
  for(const index of indexes) {
    const url=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups/${index.collectionGroup}/indexes`;
    try {await request(url,'POST',{queryScope:index.queryScope,fields:index.fields});console.log('Firestore: index creation requested.');}
    catch(error) {if(error.code!=='ALREADY_EXISTS')throw error;console.log('Firestore: index already exists.');}
  }
}catch(error){console.error('Firebase configuration failed:',error.code||error.name);process.exitCode=1;}
