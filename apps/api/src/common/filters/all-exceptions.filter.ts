import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

interface ErrorBody {
  statusCode: number;
  message: string;
  requestId?: string;
}

// Único ponto de saída para qualquer erro não capturado — garante que
// nenhum stack trace, mensagem interna do Prisma ou detalhe de
// implementação vaze para o cliente em produção. Erros conhecidos
// (HttpException) passam com seu próprio status; erros do Prisma ganham
// mapeamento explícito; qualquer outra coisa vira 500 genérico.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as { id?: string }).id;

    const { status, body } = this.resolve(exception, requestId);

    if (status >= 500) {
      this.logger.error(
        { err: exception, requestId },
        `Erro não tratado: ${request.method} ${request.url}`,
      );
    }

    response.status(status).json(body);
  }

  private resolve(
    exception: unknown,
    requestId: string | undefined,
  ): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message =
        typeof raw === 'string'
          ? raw
          : ((raw as { message?: string | string[] }).message ??
            exception.message);
      return {
        status,
        body: { statusCode: status, message: message as string, requestId },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: 409,
          body: {
            statusCode: 409,
            message: 'Conflito: registro duplicado',
            requestId,
          },
        };
      }
      if (exception.code === 'P2025') {
        return {
          status: 404,
          body: {
            statusCode: 404,
            message: 'Registro não encontrado',
            requestId,
          },
        };
      }
    }

    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd
      ? 'Internal server error'
      : ((exception as Error)?.message ?? 'Internal server error');
    return { status: 500, body: { statusCode: 500, message, requestId } };
  }
}
