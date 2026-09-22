import { loginSchema } from '@wyzetalk/db/types';
import { type FormEvent, useState } from 'react';
import { errorMessage } from '../../lib/api-error';
import { type FieldErrors, firstError, toFieldErrors } from '../../lib/form';
import type { Session } from '../../lib/auth-storage';
import type { AuthApi } from './auth.api';

type LoginFormProps = {
  api: AuthApi;
  onAuthenticated: (session: Session) => void;
};

/** Minimal sign-in: the ticket endpoints are authenticated, so the demo needs a token. */
export function LoginForm({ api, onAuthenticated }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const result = await api.login(parsed.data);
      onAuthenticated({ token: result.token, user: result.user });
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const emailError = firstError(fieldErrors, 'email');
  const passwordError = firstError(fieldErrors, 'password');

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>Sign in</h2>

      {formError ? (
        <p className="banner banner-error" role="alert">
          {formError}
        </p>
      ) : null}

      <label className="field">
        <span>Email</span>
        <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        {emailError ? (
          <span className="field-error" role="alert">
            {emailError}
          </span>
        ) : null}
      </label>

      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {passwordError ? (
          <span className="field-error" role="alert">
            {passwordError}
          </span>
        ) : null}
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
