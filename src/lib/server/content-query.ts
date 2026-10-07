import type {Query,QuerySnapshot} from 'firebase-admin/firestore';
// Single-field order indexes are available automatically. While an optional
// composite index is absent/building, scan cursor pages and filter on the server.
export function createContentReader(now=Date.now) {
  let retryAfter=0;
  return async function read(indexed:Pick<Query,'get'>,scan:Pick<Query,'get'>):Promise<QuerySnapshot> {
    if(now()<retryAfter)return scan.get();
    try {return await indexed.get();}
    catch(error) {
      const failure=error as {code?:number;message?:string};
      if(failure.code!==9||!failure.message?.toLowerCase().includes('index'))throw error;
      retryAfter=now()+60000;
      return scan.get();
    }
  };
}
export const readContentPage=createContentReader();
