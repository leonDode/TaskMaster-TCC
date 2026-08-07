import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

function parseCorsOrigins(): string[] | false {
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  // Default-deny: sem CORS_ORIGINS configurado, nenhuma origin cross-site é
  // permitida (em vez de cair num wildcard "*" por omissão).
  return origins.length > 0 ? origins : false;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));

  // Render fica atrás de um proxy reverso — confiar em exatamente 1 hop.
  // Errado (true/ilimitado) permite forjar X-Forwarded-For e contornar o
  // rate limit por IP; sem nenhum, todo req.ip vira o IP interno do proxy.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.enableCors({ origin: parseCorsOrigins(), credentials: false });

  // bodyParser: false no create() + parsers manuais abaixo, só para poder
  // fixar o limite de payload explicitamente.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
