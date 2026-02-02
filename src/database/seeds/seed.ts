import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedAdminUser } from './admin-user.seed';

config(); // Load environment variables

async function runSeeds() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'map_tracking_db',
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        synchronize: false,
    });

    try {
        await dataSource.initialize();
        console.log('🔌 Database connected');

        await seedAdminUser(dataSource);

        console.log('✅ All seeds completed');
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

runSeeds();
