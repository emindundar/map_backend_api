import {
    Injectable,
    PipeTransform,
    ArgumentMetadata,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class WsValidationPipe implements PipeTransform {
    async transform(value: any, metadata: ArgumentMetadata) {
        if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
            return value;
        }

        const object = plainToInstance(metadata.metatype, value);
        const errors = await validate(object, {
            whitelist: true,
            forbidNonWhitelisted: true,
        });

        if (errors.length > 0) {
            const messages = errors
                .map((error) => {
                    const constraints = error.constraints
                        ? Object.values(error.constraints)
                        : [];
                    return `${error.property}: ${constraints.join(', ')}`;
                })
                .join('; ');

            throw new WsException(`Validasyon hatası: ${messages}`);
        }

        return object;
    }

    private toValidate(metatype: any): boolean {
        const types = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }
}
