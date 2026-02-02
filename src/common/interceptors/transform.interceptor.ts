import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    ClassSerializerInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T>
    extends ClassSerializerInterceptor
    implements NestInterceptor<T, any> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => {
                // ClassSerializerInterceptor'ın serialize metodunu kullan
                return super.serialize(data, {
                    excludeExtraneousValues: false,
                    enableImplicitConversion: true,
                });
            }),
        );
    }
}
