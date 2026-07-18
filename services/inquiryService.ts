import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { app, auth } from './firebase';

const db = getFirestore(app);

export type InquiryStatus = 'open' | 'answered';

export interface Inquiry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  title: string;
  message: string;
  status: InquiryStatus;
  reply: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  answeredAt: Timestamp | null;
  answeredBy: string;
}

export interface CreateInquiryInput {
  category: string;
  title: string;
  message: string;
}

const DEFAULT_ADMIN_EMAIL = 'gog031103@gmail.com';
export const isInquiryAdmin = (user: User | null) => (
  Boolean(user?.email && user.emailVerified && user.email.toLowerCase() === DEFAULT_ADMIN_EMAIL)
);

const mapInquiry = (id: string, data: Record<string, unknown>): Inquiry => ({
  id,
  userId: String(data.userId || ''),
  userName: String(data.userName || '사용자'),
  userEmail: String(data.userEmail || ''),
  category: String(data.category || '기타'),
  title: String(data.title || ''),
  message: String(data.message || ''),
  status: data.status === 'answered' ? 'answered' : 'open',
  reply: String(data.reply || ''),
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
  answeredAt: data.answeredAt instanceof Timestamp ? data.answeredAt : null,
  answeredBy: String(data.answeredBy || ''),
});

const sortNewestFirst = (items: Inquiry[]) => items.sort((a, b) => (
  (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
));

export async function createInquiry(input: CreateInquiryInput) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.');

  await addDoc(collection(db, 'inquiries'), {
    userId: user.uid,
    userName: user.displayName || user.email.split('@')[0],
    userEmail: user.email,
    category: input.category,
    title: input.title,
    message: input.message,
    status: 'open',
    reply: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    answeredAt: null,
    answeredBy: '',
  });
}

export async function getMyInquiries(userId: string) {
  const snapshot = await getDocs(query(collection(db, 'inquiries'), where('userId', '==', userId)));
  return sortNewestFirst(snapshot.docs.map((item) => mapInquiry(item.id, item.data())));
}

export async function getAllInquiries() {
  const snapshot = await getDocs(collection(db, 'inquiries'));
  return sortNewestFirst(snapshot.docs.map((item) => mapInquiry(item.id, item.data())));
}

export async function answerInquiry(inquiryId: string, reply: string) {
  const user = auth.currentUser;
  if (!isInquiryAdmin(user)) throw new Error('관리자만 답변을 등록할 수 있습니다.');

  await updateDoc(doc(db, 'inquiries', inquiryId), {
    reply,
    status: 'answered',
    answeredAt: serverTimestamp(),
    answeredBy: user?.email || DEFAULT_ADMIN_EMAIL,
    updatedAt: serverTimestamp(),
  });
}
