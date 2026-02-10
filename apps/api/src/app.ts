import 'dotenv/config';

import cors from 'cors';
import express, { type Request, type Response } from 'express';

const app = express();

const port = Number(process.env.PORT ?? 4000);
const frontUrl = process.env.FRONT_URL ?? 'http://localhost:3000';

app.use(
  cors({
    origin: frontUrl,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
