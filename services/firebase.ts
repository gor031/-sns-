import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from 'firebase/auth';
import {
  getToken as getAppCheckToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';

// Firebase web configuration and reCAPTCHA site keys identify this public web app.
// They are intentionally public; provider API secrets remain in Netlify environment variables.
const firebaseConfig = {
  projectId: 'cardnews-ai-studio',
  appId: '1:1075022418609:web:f5a19dc724be2740158890',
  storageBucket: 'cardnews-ai-studio.firebasestorage.app',
  apiKey: 'FIREBASE_API_KEY_REMOVED',
  authDomain: 'cardnews-ai-studio.firebaseapp.com',
  messagingSenderId: '1075022418609',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
void setPersistence(auth, browserLocalPersistence).catch(() => {
  // Firebase falls back to the current session when durable browser storage is unavailable.
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('RECAPTCHA_SITE_KEY_REMOVED'),
  isTokenAutoRefreshEnabled: true,
});

export async function createProtectedHeaders(
  additionalHeaders: Record<string, string> = {},
): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('계속하려면 Google 계정으로 로그인해주세요.');
  }

  const [idToken, appCheckResult] = await Promise.all([
    user.getIdToken(),
    getAppCheckToken(appCheck, false),
  ]);

  return {
    ...additionalHeaders,
    Authorization: `Bearer ${idToken}`,
    'X-Firebase-AppCheck': appCheckResult.token,
  };
}
