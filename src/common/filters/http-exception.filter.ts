import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error: string | object = 'An unexpected error occurred';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
                error = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                message =
                    (exceptionResponse as any).message || exception.message;
                error = (exceptionResponse as any).message || exceptionResponse;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
            error = exception.message;
        }

        // Log the error
        this.logger.error(
            `${request.method} ${request.url}`,
            exception instanceof Error ? exception.stack : 'Unknown error',
        );

        const errorResponse: ApiResponse = {
            success: false,
            message,
            error: typeof error === 'string' ? error : JSON.stringify(error),
        };

        response.status(status).json(errorResponse);
    }
}
