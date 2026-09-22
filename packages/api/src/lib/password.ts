import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

// Cheaper rounds under test keep the suite fast; production pays the full cost.
const SALT_ROUNDS = env.isTest ? 4 : 12;

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
