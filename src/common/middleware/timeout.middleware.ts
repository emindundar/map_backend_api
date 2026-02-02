import { Injectable, NestMiddleware, RequestTimeoutException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TimeoutMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                throw new RequestTimeoutException('Request timeout - operation took too long');
            }
        }, 30000); // 30 seconds

        res.on('finish', () => {
            clearTimeout(timeout);
        });

        res.on('close', () => {
            clearTimeout(timeout);
        });

        next();
    }
}
