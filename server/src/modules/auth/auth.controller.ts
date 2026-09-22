import { loginSchema, registerSchema } from '@wyzetalk/db/types';
import type { Request, Response } from 'express';
import { services } from '../../container.js';
import { requireActor } from '../../middleware/authenticate.js';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const input = registerSchema.parse(req.body);
    res.status(201).json(await services.auth.register(input));
  },

  async login(req: Request, res: Response): Promise<void> {
    const input = loginSchema.parse(req.body);
    res.status(200).json(await services.auth.login(input));
  },

  async me(req: Request, res: Response): Promise<void> {
    res.status(200).json(await services.auth.me(requireActor(req)));
  },
};
