/**
 * Mirrors the shape produced by `AllExceptionsFilter` on the API
 * (apps/api/src/common/filters/all-exceptions.filter.ts). `message` is a
 * single string for most errors, but class-validator (400) responses send
 * an array of validation messages.
 */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  requestId?: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly requestId?: string;
  readonly body: ApiErrorBody;

  constructor(body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join('; ') : body.message);
    this.name = 'ApiError';
    this.statusCode = body.statusCode;
    this.requestId = body.requestId;
    this.body = body;
  }
}
