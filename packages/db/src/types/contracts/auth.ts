import { z } from 'zod';
import { emailSchema, nameSchema, passwordSchema, type UserDto } from './users.js';

/** Self-service signup always creates a `requester`; staff are created by an admin. */
export const registerSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type AuthResponseDto = {
  token: string;
  /** Seconds until `token` expires. */
  expiresIn: number;
  user: UserDto;
}

/** Claims carried inside the access token. */
export type AccessTokenClaims = {
  sub: string;
  email: string;
  role: UserDto['role'];
}
