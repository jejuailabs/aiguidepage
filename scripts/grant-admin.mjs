import {getFirebaseAdminAuth} from '../src/lib/firebase/admin.ts';
const email=process.argv.find(value=>value.startsWith('--email='))?.slice(8);
if(!email)throw new Error('Usage: npm run grant-admin -- --email=you@example.com [--revoke]');
const auth=getFirebaseAdminAuth();
try {
  const user=await auth.getUserByEmail(email);
  if(!user.emailVerified)throw new Error('The user must complete verified sign-in first');
  const claims={...user.customClaims};
  if(process.argv.includes('--revoke'))delete claims.platformAdmin;else claims.platformAdmin=true;
  await auth.setCustomUserClaims(user.uid,claims);
  await auth.revokeRefreshTokens(user.uid);
  console.log('Administrator claim updated. Sign in again to apply it.');
} catch(error) {console.error('Administrator update failed:',error.code||error.message);process.exitCode=1;}
