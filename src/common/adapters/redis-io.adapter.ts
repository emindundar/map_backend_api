import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { INestApplication, Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
    private readonly logger = new Logger(RedisIoAdapter.name);
    private adapterConstructor?: ReturnType<typeof createAdapter>;
    private pubClient?: RedisClientType;
    private subClient?: RedisClientType;

    constructor(
        private readonly app: INestApplication,
        private readonly redisUrl: string,
    ) {
        super(app);
    }

    async connectToRedis(): Promise<void> {
        this.pubClient = createClient({ url: this.redisUrl });
        this.subClient = this.pubClient.duplicate();

        this.pubClient.on('error', (error) => {
            this.logger.error(`Redis pub client error: ${error.message}`, error.stack);
        });
        this.subClient.on('error', (error) => {
            this.logger.error(`Redis sub client error: ${error.message}`, error.stack);
        });

        await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
        this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
        this.logger.log('✅ Redis adapter connected');
    }

    createIOServer(port: number, options?: any) {
        const server = super.createIOServer(port, options);
        if (this.adapterConstructor) {
            server.adapter(this.adapterConstructor);
        }
        return server;
    }
}
