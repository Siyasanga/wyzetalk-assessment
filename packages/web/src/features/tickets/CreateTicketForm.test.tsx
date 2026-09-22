import type { TicketDto } from '@wyzetalk/db/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createApiError } from '../../lib/api-error';
import { CreateTicketForm } from './CreateTicketForm';
import type { TicketApi } from './ticket.api';

const ticket: TicketDto = {
  id: '6650f1a2b3c4d5e6f7a8b9c0',
  title: 'Laptop will not connect to WiFi',
  description: 'It drops the office network every few minutes since this morning.',
  status: 'open',
  priority: 'high',
  category: 'network',
  requester: { id: '6650f1a2b3c4d5e6f7a8b9c1', name: 'Sam', email: 'sam@wyzetalk.test', role: 'requester' },
  assignee: null,
  dueAt: '2026-09-23T09:00:00.000Z',
  isOverdue: false,
  resolvedAt: null,
  closedAt: null,
  createdAt: '2026-09-22T09:00:00.000Z',
  updatedAt: '2026-09-22T09:00:00.000Z',
};

function setup(api: Pick<TicketApi, 'create'>) {
  const onCreated = vi.fn();
  render(<CreateTicketForm api={api} onCreated={onCreated} />);
  return { onCreated, user: userEvent.setup() };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Title'), ticket.title);
  await user.type(screen.getByLabelText('Description'), ticket.description);
  await user.selectOptions(screen.getByLabelText('Priority'), 'high');
  await user.selectOptions(screen.getByLabelText('Category'), 'network');
}

describe('CreateTicketForm', () => {
  it('submits the form values to the ticket endpoint and reports the new ticket', async () => {
    const create = vi.fn().mockResolvedValue(ticket);
    const { onCreated, user } = setup({ create });

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({
      title: ticket.title,
      description: ticket.description,
      priority: 'high',
      category: 'network',
    });
    expect(onCreated).toHaveBeenCalledWith(ticket);
    // A successful submit clears the form, ready for the next request.
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('rejects a too-short title locally, without calling the API', async () => {
    const create = vi.fn();
    const { user } = setup({ create });

    await user.type(screen.getByLabelText('Title'), 'wifi');
    await user.type(screen.getByLabelText('Description'), ticket.description);
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(await screen.findByText('Title is too short.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('shows field errors returned by the API', async () => {
    const create = vi.fn().mockRejectedValue(
      createApiError({
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'The request failed validation.',
        fieldErrors: { description: ['Description is too short.'] },
      }),
    );
    const { onCreated, user } = setup({ create });

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(await screen.findByText('Description is too short.')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('surfaces a server outage as a banner rather than a field error', async () => {
    const create = vi.fn().mockRejectedValue(
      createApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Could not reach the server. Is the API running?' }),
    );
    const { user } = setup({ create });

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.');
  });
});
