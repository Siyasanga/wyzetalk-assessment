import {
  assignTicketSchema,
  changeTicketStatusSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  updateTicketSchema,
} from '@wyzetalk/db/types';
import type { Request, Response } from 'express';
import { services } from '../../container.js';
import { requireActor } from '../../middleware/authenticate.js';

export const ticketController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = listTicketsQuerySchema.parse(req.query);
    res.status(200).json(await services.tickets.list(requireActor(req), query));
  },

  async stats(req: Request, res: Response): Promise<void> {
    res.status(200).json(await services.tickets.stats(requireActor(req)));
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = ticketIdParamSchema.parse(req.params);
    res.status(200).json(await services.tickets.getById(requireActor(req), id));
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = createTicketSchema.parse(req.body);
    res.status(201).json(await services.tickets.create(requireActor(req), input));
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = ticketIdParamSchema.parse(req.params);
    const input = updateTicketSchema.parse(req.body);
    res.status(200).json(await services.tickets.update(requireActor(req), id, input));
  },

  async changeStatus(req: Request, res: Response): Promise<void> {
    const { id } = ticketIdParamSchema.parse(req.params);
    const input = changeTicketStatusSchema.parse(req.body);
    res.status(200).json(await services.tickets.changeStatus(requireActor(req), id, input));
  },

  async assign(req: Request, res: Response): Promise<void> {
    const { id } = ticketIdParamSchema.parse(req.params);
    const input = assignTicketSchema.parse(req.body);
    res.status(200).json(await services.tickets.assign(requireActor(req), id, input));
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = ticketIdParamSchema.parse(req.params);
    await services.tickets.remove(requireActor(req), id);
    res.status(204).send();
  },
};
