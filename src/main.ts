import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '512kb' }));
  app.use(urlencoded({ extended: true, limit: '512kb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService);
  const origin =
    config.get<string>('FRONTEND_ORIGIN')?.trim() || 'http://localhost:5173';
  app.enableCors({ origin, credentials: true });

  const port = Number(config.get('PORT') ?? process.env.PORT ?? 3000);
  await app.listen(port);
}
void bootstrap();
