import type { TicketUserRefDto, User, UserDto } from '@wyzetalk/db/types';

/** Domain → wire. Dates become ISO strings; nothing else changes shape. */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** The trimmed form embedded inside a ticket payload. */
export function toTicketUserRefDto(user: User): TicketUserRefDto {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
