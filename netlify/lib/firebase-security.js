import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';

const PROJECT_ID = 'cardnews-ai-studio';
const WEB_APP_ID = '1:1075022418609:web:f5a19dc724be2740158890';

const adminApp = getApps()[0] || initializeApp({ projectId: PROJECT_ID });
const adminAuth = getAuth(adminApp);
const adminAppCheck = getAppCheck(adminApp);

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
  body: JSON.stringify(body),
});

const getHeader = (event, name) => {
  const headers = event.headers || {};
  return headers[name] || headers[name.toLowerCase()] || '';
};

export async function requireFirebaseSecurity(event) {
  const authorization = getHeader(event, 'Authorization');
  const appCheckToken = getHeader(event, 'X-Firebase-AppCheck');
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (!idToken) {
    return { ok: false, response: jsonResponse(401, { error: '로그인이 필요합니다.' }) };
  }
  if (!appCheckToken) {
    return { ok: false, response: jsonResponse(403, { error: '앱 보안 확인이 필요합니다.' }) };
  }

  try {
    const [decodedAuth, decodedAppCheck] = await Promise.all([
      adminAuth.verifyIdToken(idToken),
      adminAppCheck.verifyToken(appCheckToken),
    ]);
    const verifiedAppId = decodedAppCheck.appId || decodedAppCheck.app_id || decodedAppCheck.sub;
    if (verifiedAppId !== WEB_APP_ID) {
      return { ok: false, response: jsonResponse(403, { error: '허용되지 않은 앱 요청입니다.' }) };
    }
    return { ok: true, uid: decodedAuth.uid };
  } catch (error) {
    console.warn('Firebase request verification failed:', error?.code || error?.message || 'unknown');
    return { ok: false, response: jsonResponse(401, { error: '로그인 또는 앱 보안 확인이 만료되었습니다.' }) };
  }
}
