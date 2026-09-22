/**
 * Who may do what. Kept as pure predicates over `Actor` + `Ticket` so the same
 * rules can drive API guards and UI affordances without drifting apart.
 */

import type { Ticket } from './ticket.js';
import { type Actor, type UserId, roleAtLeast } from './user.js';

export function isStaff(actor: Actor): boolean {
  return roleAtLeast(actor.role, 'agent');
}

export function isAdmin(actor: Actor): boolean {
  return actor.role === 'admin';
}

function owns(actor: Actor, ticket: Ticket): boolean {
  return ticket.requesterId === actor.id;
}

/**
 * The scope a listing must be narrowed to. `null` means "no restriction";
 * a requester only ever sees the tickets they raised.
 */
export function ticketScopeFor(actor: Actor): { requesterId: UserId } | null {
  return isStaff(actor) ? null : { requesterId: actor.id };
}

export function canViewTicket(actor: Actor, ticket: Ticket): boolean {
  return isStaff(actor) || owns(actor, ticket);
}

/** Editing title / description / priority. Requesters lose the right once it is resolved. */
export function canEditTicket(actor: Actor, ticket: Ticket): boolean {
  if (isStaff(actor)) return true;
  return owns(actor, ticket) && ticket.status !== 'closed' && ticket.status !== 'resolved';
}

/** Requesters may close or reopen their own ticket; everything else is staff work. */
export function canChangeStatus(actor: Actor, ticket: Ticket): boolean {
  if (isStaff(actor)) return true;
  return owns(actor, ticket);
}

export function canAssignTicket(actor: Actor): boolean {
  return isStaff(actor);
}

export function canDeleteTicket(actor: Actor): boolean {
  return isAdmin(actor);
}

export function canManageUsers(actor: Actor): boolean {
  return isAdmin(actor);
}

/** Anyone may read their own record; only admins read other people's. */
export function canViewUser(actor: Actor, targetId: UserId): boolean {
  return isAdmin(actor) || actor.id === targetId;
}
