import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        // Public route kontrolü
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            if (info?.name === 'TokenExpiredError') {
                throw new UnauthorizedException(
                    'Token süresi dolmuş. Lütfen tekrar giriş yapın.',
                );
            }
            if (info?.name === 'JsonWebTokenError') {
                throw new UnauthorizedException('Geçersiz token.');
            }
            throw err || new UnauthorizedException('Yetkilendirme başarısız.');
        }
        return user;
    }
}
