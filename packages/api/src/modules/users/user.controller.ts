import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from '@wyzetalk/db/types';
import type { Request, Response } from 'express';
import { services } from '../../container.js';
import { requireActor } from '../../middleware/authenticate.js';

/**
 * Controllers do three things and nothing else: parse the request against a
 * contract, call a service, shape the response.
 */
export const userController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = listUsersQuerySchema.parse(req.query);
    res.status(200).json(await services.users.list(requireActor(req), query));
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = userIdParamSchema.parse(req.params);
    res.status(200).json(await services.users.getById(requireActor(req), id));
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = createUserSchema.parse(req.body);
    res.status(201).json(await services.users.create(requireActor(req), input));
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = userIdParamSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);
    res.status(200).json(await services.users.update(requireActor(req), id, input));
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = userIdParamSchema.parse(req.params);
    await services.users.remove(requireActor(req), id);
    res.status(204).send();
  },
};
