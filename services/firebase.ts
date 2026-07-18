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
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missingFirebaseConfig.length > 0) {
  throw new Error(`Firebase 환경변수가 누락되었습니다: ${missingFirebaseConfig.join(', ')}`);
}

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
void setPersistence(auth, browserLocalPersistence).catch(() => {
  // Firebase falls back to the current session when durable browser storage is unavailable.
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY),
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
