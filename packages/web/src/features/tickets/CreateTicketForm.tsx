import {
  createTicketSchema,
  type TicketCategory,
  type TicketDto,
  type TicketPriority,
} from '@wyzetalk/db/types';
import { type FormEvent, useState } from 'react';
import { errorMessage, isApiError } from '../../lib/api-error';
import { type FieldErrors, firstError, toFieldErrors } from '../../lib/form';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '../../lib/labels';
import type { TicketApi } from './ticket.api';

type CreateTicketFormProps = {
  /** Only the one call it makes: a component should not depend on the whole API. */
  api: Pick<TicketApi, 'create'>;
  onCreated: (ticket: TicketDto) => void;
};

type FormState = {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  priority: 'medium',
  category: 'other',
};

/**
 * The create-request form.
 *
 * Validation runs against `createTicketSchema` — the same zod schema the API
 * parses the request body with — so the two can never drift. The server still
 * validates: this only saves a round trip and gives immediate feedback.
 */
export function CreateTicketForm({ api, onCreated }: CreateTicketFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);

    const parsed = createTicketSchema.safeParse(form);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const ticket = await api.create(parsed.data);
      setForm(EMPTY_FORM);
      onCreated(ticket);
    } catch (error) {
      // A 422 carries per-field messages; anything else is a banner.
      if (isApiError(error) && Object.keys(error.fieldErrors).length > 0) {
        setFieldErrors(error.fieldErrors);
      }
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const titleError = firstError(fieldErrors, 'title');
  const descriptionError = firstError(fieldErrors, 'description');
  const priorityError = firstError(fieldErrors, 'priority');
  const categoryError = firstError(fieldErrors, 'category');

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>Log a service request</h2>

      {formError ? (
        <p className="banner banner-error" role="alert">
          {formError}
        </p>
      ) : null}

      <label className="field">
        <span>Title</span>
        <input
          name="title"
          value={form.title}
          onChange={(event) => update('title', event.target.value)}
          placeholder="My laptop isn't connecting to WiFi"
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? 'title-error' : undefined}
        />
        {titleError ? (
          <span className="field-error" id="title-error" role="alert">
            {titleError}
          </span>
        ) : null}
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          name="description"
          rows={5}
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="What happened, what you expected, and anything you already tried."
          aria-invalid={descriptionError ? true : undefined}
          aria-describedby={descriptionError ? 'description-error' : undefined}
        />
        {descriptionError ? (
          <span className="field-error" id="description-error" role="alert">
            {descriptionError}
          </span>
        ) : null}
      </label>

      <label className="field">
        <span>Priority</span>
        <select
          name="priority"
          value={form.priority}
          onChange={(event) => update('priority', event.target.value as TicketPriority)}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {priorityError ? (
          <span className="field-error" role="alert">
            {priorityError}
          </span>
        ) : null}
      </label>

      <label className="field">
        <span>Category</span>
        <select
          name="category"
          value={form.category}
          onChange={(event) => update('category', event.target.value as TicketCategory)}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {categoryError ? (
          <span className="field-error" role="alert">
            {categoryError}
          </span>
        ) : null}
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
