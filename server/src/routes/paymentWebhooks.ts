import express, { Router } from 'express';
import { clickHandler, clickParseError } from '../controllers/clickController';
import { paymeHandler, paymeParseError } from '../controllers/paymeController';

/*
 * Payme va Click serverlari shu manzillarga so'rov yuboradi (autentifikatsiya: Payme — Basic, Click — imzo).
 * Bu routerlar app.ts'da umumiy express.json() dan OLDIN ulanadi, chunki Payme "text/json" yuboradi
 * va JSON xatosini o'z formatida (-32700) qaytarishi kerak.
 */

export const paymeRouter = Router();
paymeRouter.use(express.json({ type: ['application/json', 'text/json'], limit: '100kb' }));
paymeRouter.use(paymeParseError);
paymeRouter.all('/', paymeHandler);

export const clickRouter = Router();
clickRouter.use(express.urlencoded({ extended: false, limit: '100kb' }));
clickRouter.use(express.json({ limit: '100kb' }));
clickRouter.use(clickParseError);
clickRouter.all('/', clickHandler);
