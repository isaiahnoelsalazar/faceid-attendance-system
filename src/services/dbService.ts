import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  faceDescriptor?: number[];
  createdAt: string;
}

export interface AttendanceRecord {
  id?: string;
  uid: string;
  userName: string;
  timestamp: string;
  type: 'in' | 'out';
  location: { lat: number; lng: number };
  isWithinRange: boolean;
}

export interface Settings {
  allowedLocation: { lat: number; lng: number };
  allowedRadius: number;
}

export const getUserProfile = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const saveUserProfile = async (profile: UserProfile) => {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const logAttendance = async (record: AttendanceRecord) => {
  const path = 'attendance';
  try {
    await addDoc(collection(db, 'attendance'), record);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getSettings = async () => {
  const path = 'settings/global';
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as Settings) : { allowedLocation: { lat: 0, lng: 0 }, allowedRadius: 100 };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return { allowedLocation: { lat: 0, lng: 0 }, allowedRadius: 100 };
  }
};

export const saveSettings = async (settings: Settings) => {
  const path = 'settings/global';
  try {
    await setDoc(doc(db, 'settings', 'global'), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
