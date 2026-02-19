// Authentication utilities for managing users in IndexedDB
import { openDB, STORES } from './database';

export type User = {
  id?: number;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
};

const USERS_STORE = STORES.USERS;

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Register a new user
export async function registerUser(email: string, password: string, name: string): Promise<User> {
  const db = await openDB();
  
  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  const passwordHash = await hashPassword(password);
  const user: Omit<User, 'id'> = {
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(USERS_STORE, 'readwrite');
    const store = transaction.objectStore(USERS_STORE);
    const request = store.add(user);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve({ ...user, id: request.result as number });
    };
  });
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(USERS_STORE, 'readonly');
    const store = transaction.objectStore(USERS_STORE);
    const index = store.index('email');
    const request = index.get(email.toLowerCase().trim());

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// Verify user credentials
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }
  
  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    return null;
  }
  
  return user;
}

// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(USERS_STORE, 'readonly');
    const store = transaction.objectStore(USERS_STORE);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}
