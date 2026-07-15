import 'dotenv/config'; // MUST be first — loads .env before any module reads process.env
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie-parser so NestJS can read req.cookies.
  // Required for the HttpOnly JWT cookie flow in JwtAuthGuard.
  // Using require() because cookie-parser's type definitions are not compatible
  // with `import *` under isolatedModules + emitDecoratorMetadata.
  app.use(cookieParser());

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.enableCors({ 
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
    credentials: true 
  });
  // Strip unknown properties from DTOs and validate incoming request payloads.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // Strips properties not defined in the DTO
      forbidNonWhitelisted: true,  // Reject requests with extra props
      transform: true,             // Auto-transform payloads to their DTO class types
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application running on: http://localhost:${port}`);
}
bootstrap();
