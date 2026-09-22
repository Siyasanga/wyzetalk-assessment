import {
  type Actor,
  type AuthResponseDto,
  type LoginInput,
  type RegisterInput,
  type UserDto,
  type UserRepository,
  normalizeEmail,
  toActor,
} from '@wyzetalk/db/types';
import { conflictError, notFoundError, unauthorizedError } from '../../lib/http-errors.js';
import { signAccessToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { toUserDto } from '../users/user.serializer.js';

export type AuthService = {
  register(input: RegisterInput): Promise<AuthResponseDto>;
  login(input: LoginInput): Promise<AuthResponseDto>;
  me(actor: Actor): Promise<UserDto>;
};

export function createAuthService(users: UserRepository): AuthService {
  function issue(user: UserDto, actor: Actor): AuthResponseDto {
    const { token, expiresIn } = signAccessToken({
      sub: actor.id,
      email: actor.email,
      role: actor.role,
    });

    return { token, expiresIn, user };
  }

  /** Self-service signup. Always a `requester` — staff accounts are created by an admin. */
  async function register(input: RegisterInput): Promise<AuthResponseDto> {
    const email = normalizeEmail(input.email);

    if (await users.findByEmail(email)) {
      throw conflictError('A user with that email address already exists.');
    }

    const user = await users.create({
      email,
      name: input.name,
      role: 'requester',
      passwordHash: await hashPassword(input.password),
    });

    return issue(toUserDto(user), toActor(user));
  }

  async function login(input: LoginInput): Promise<AuthResponseDto> {
    const user = await users.findByEmail(normalizeEmail(input.email));

    // Same message whether the email is unknown or the password is wrong:
    // distinguishing them hands an attacker a user-enumeration oracle.
    const invalid = unauthorizedError('Those credentials are not valid.');
    if (!user) throw invalid;
    if (!(await verifyPassword(input.password, user.passwordHash))) throw invalid;
    if (!user.isActive) throw unauthorizedError('This account has been deactivated.');

    return issue(toUserDto(user), toActor(user));
  }

  /** Resolves the token holder against current state — the token itself may be stale. */
  async function me(actor: Actor): Promise<UserDto> {
    const user = await users.findById(actor.id);
    if (!user) throw notFoundError('User');

    return toUserDto(user);
  }

  return { register, login, me };
}
