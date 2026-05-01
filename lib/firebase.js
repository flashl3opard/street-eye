import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase, push, ref, update, onValue, query, orderByChild, limitToLast } from 'firebase/database';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCTl-wMLZKTSR6hH9VgFZjfHEWDTGrHNec',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'street-eye-9d77e.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'street-eye-9d77e',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'street-eye-9d77e.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '855251119499',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:855251119499:web:f2f93107466dd7ade8938e',
};

const hasRequiredConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const app = getApps().length ? getApp() : hasRequiredConfig ? initializeApp(firebaseConfig) : null;
const db = app ? getDatabase(app) : null;

const ALERT_TYPES = new Set(['fault', 'warn', 'critical']);

export function isFirebaseReady() {
    return Boolean(db);
}

export function isAlertType(type) {
    return ALERT_TYPES.has(type);
}

export function makeLogEntry({
    type = 'info',
    title = 'SYSTEM EVENT',
    msg = '',
    lampId = null,
    lampLabel = null,
    category = 'system',
    source = 'dashboard',
    createdAt = Date.now(),
}) {
    return {
        id: `${createdAt}-${Math.random().toString(36).slice(2, 10)}`,
        createdAt,
        time: new Date(createdAt).toLocaleTimeString('en-IN', { hour12: false }),
        type,
        title,
        msg,
        lampId,
        lampLabel,
        category,
        source,
    };
}

function normalizeSnapshot(snapshot) {
    if (!snapshot.exists()) return [];

    return Object.entries(snapshot.val() || {})
        .map(([id, entry]) => ({ id, ...entry }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function subscribeToLogs(onChange) {
    if (!db) return () => { };

    const logsQuery = query(ref(db, 'logs'), orderByChild('createdAt'), limitToLast(250));
    return onValue(logsQuery, snapshot => {
        const entries = normalizeSnapshot(snapshot);
        onChange(entries);
    });
}

export async function appendLog(entry) {
    const payload = entry && entry.id && entry.createdAt ? entry : makeLogEntry(entry);

    if (!db) {
        return payload;
    }

    const logsRef = ref(db, 'logs');
    const newEntryRef = push(logsRef);
    const key = newEntryRef.key;

    if (!key) {
        throw new Error('Unable to allocate a Firebase log key');
    }

    await update(ref(db), {
        [`logs/${key}`]: { ...payload, id: key },
    });

    return { ...payload, id: key };
}
