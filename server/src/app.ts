import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/errorHandler';
import routes from './routes';
import { clickRouter, paymeRouter } from './routes/paymentWebhooks';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.clientUrl }));

// To'lov provayderlari webhook'lari (o'z parserlari bor, umumiy express.json() dan oldin turishi shart)
app.use('/api/payments/payme', paymeRouter);
app.use('/api/payments/click', clickRouter);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, message: 'Server ishlayapti' });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
