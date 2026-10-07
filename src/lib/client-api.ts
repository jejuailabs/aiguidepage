'use client';
export class ApiError extends Error {constructor(public code:string){super(code);}}
export async function api<T=Record<string,unknown>>(path:string,body?:unknown,method?:string):Promise<T> {
  const response=await fetch(path,{method:method||(body===undefined?'GET':'POST'),headers:{'Content-Type':'application/json','X-Requested-With':'aiguide'},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store'});
  let data;try{data=await response.json();}catch{throw new ApiError('unavailable');}
  if(!response.ok)throw new ApiError(data.error||'unavailable');return data;
}
