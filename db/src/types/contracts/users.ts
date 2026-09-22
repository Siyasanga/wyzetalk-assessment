import { z } from 'zod';
import { USER_ROLES } from '../domain/user.js';
import { entityIdSchema, paginationQuerySchema } from './common.js';

export const userRoleSchema = z.enum(USER_ROLES);

export const emailSchema = z.string().trim().toLowerCase().email('Must be a valid email address.');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.');

export const nameSchema = z.string().trim().min(2, 'Name is too short.').max(80);

export type UserDto = {
  id: string;
  email: string;
  name: string;
  role: (typeof USER_ROLES)[number];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const createUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
  role: userRoleSchema.default('requester'),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: userRoleSchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  /** Free-text match on name or email. */
  q: z.string().trim().min(1).max(80).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const userIdParamSchema = z.object({ id: entityIdSchema });
