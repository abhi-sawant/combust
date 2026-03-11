import * as Crypto from 'expo-crypto';
import { openDB } from './database';

export type User = {
  id: number;
  email: string;
  name: string;
  createdAt: string;
};

async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const db = await openDB();

  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM users WHERE email = ?',
    [email.toLowerCase().trim()]
  );

  if (existing) {
    throw new Error('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const result = await db.runAsync(
    'INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)',
    [email.toLowerCase().trim(), passwordHash, name.trim(), now]
  );

  return {
    id: result.lastInsertRowId,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    createdAt: now,
  };
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const db = await openDB();
  const passwordHash = await hashPassword(password);

  const user = await db.getFirstAsync<{
    id: number;
    email: string;
    name: string;
    created_at: string;
  }>(
    'SELECT id, email, name, created_at FROM users WHERE email = ? AND password_hash = ?',
    [email.toLowerCase().trim(), passwordHash]
  );

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.created_at,
  };
}

export async function getUserById(id: number): Promise<User | null> {
  const db = await openDB();

  const user = await db.getFirstAsync<{
    id: number;
    email: string;
    name: string;
    created_at: string;
  }>('SELECT id, email, name, created_at FROM users WHERE id = ?', [id]);

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.created_at,
  };
}
