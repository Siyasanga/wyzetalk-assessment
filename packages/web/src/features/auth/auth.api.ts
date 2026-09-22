import type { AuthResponseDto, LoginInput } from '@wyzetalk/db/types';
import type { ApiClient } from '../../lib/api-client';

export type AuthApi = {
  login: (input: LoginInput) => Promise<AuthResponseDto>;
};

export function createAuthApi(client: ApiClient): AuthApi {
  return {
    login: (input) => client.request<AuthResponseDto>('/auth/login', { method: 'POST', body: input }),
  };
}
