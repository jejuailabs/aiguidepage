import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createContentReader} from '../src/lib/server/content-query.ts';
test('missing indexes use cursor scan pages, back off and retry the index later',async()=>{
  let time=100,calls=0,scans=0;
  const read=createContentReader(()=>time);
  const indexed={get:async()=>{calls++;throw {code:9,message:'The query requires an index'};}};
  const scan={get:async()=>{scans++;return {docs:[],size:0};}};
  await read(indexed,scan);await read(indexed,scan);assert.equal(calls,1);assert.equal(scans,2);
  time+=60001;await read(indexed,scan);assert.equal(calls,2);
});
test('permission failures never fall back',async()=>{
  const read=createContentReader();let scanned=false;
  await assert.rejects(read({get:async()=>{throw {code:7};}},{get:async()=>{scanned=true;return {};}}),error=>error.code===7);
  assert.equal(scanned,false);
});
