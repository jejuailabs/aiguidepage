import {PortalError} from './errors.ts';
// Next may normalize request.url to localhost. The HTTP Host retains the origin
// addressed by the browser, including the port. Never trust forwarded-host input.
export function verifyMutation(request:Pick<Request,'url'|'method'|'headers'>) {
  const origin=request.headers.get('origin');
  const target=new URL(request.url);
  const host=request.headers.get('host')||target.host;
  const forwardedProtocol=request.headers.get('x-forwarded-proto');
  const protocol=forwardedProtocol==='https'||forwardedProtocol==='http'?`${forwardedProtocol}:`:target.protocol;
  if(!origin||origin!==`${protocol}//${host}`||request.headers.get('x-requested-with')!=='aiguide')throw new PortalError('forbidden',403);
  if(request.method!=='DELETE'&&!request.headers.get('content-type')?.startsWith('application/json'))throw new PortalError('invalid',400);
}
