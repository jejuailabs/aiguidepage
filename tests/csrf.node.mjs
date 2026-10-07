import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyMutation} from '../src/lib/server/csrf.ts';
const req=(headers,method='POST')=>new Request('http://localhost:3002/api/session',{method,headers:{Host:'127.0.0.1:3002',Origin:'http://127.0.0.1:3002','X-Requested-With':'aiguide','Content-Type':'application/json',...headers}});
test('accepts the browser origin when Next normalizes its internal URL',()=>assert.doesNotThrow(()=>verifyMutation(req({}))));
test('rejects cross-site and forwarded-host spoofing',()=>{
  assert.throws(()=>verifyMutation(req({Origin:'https://attacker.test','X-Forwarded-Host':'attacker.test'})),error=>error.code==='forbidden');
  assert.throws(()=>verifyMutation(req({'X-Requested-With':''})),error=>error.code==='forbidden');
  assert.throws(()=>verifyMutation(req({Origin:'null'})),error=>error.code==='forbidden');
});
test('supports HTTPS behind the hosting proxy and validates body type',()=>{
  assert.doesNotThrow(()=>verifyMutation(req({Host:'aiguidepage.vercel.app',Origin:'https://aiguidepage.vercel.app','X-Forwarded-Proto':'https'})));
  assert.throws(()=>verifyMutation(req({'Content-Type':'text/plain'})),error=>error.code==='invalid');
  assert.doesNotThrow(()=>verifyMutation(req({'Content-Type':''},'DELETE')));
});
