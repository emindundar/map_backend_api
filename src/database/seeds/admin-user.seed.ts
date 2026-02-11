import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../modules/users/entities/user.entity';

export async function seedAdminUser(dataSource: DataSource) {
    const userRepository = dataSource.getRepository(User);
    const envEmail = process.env.ADMIN_EMAIL;
    const envPassword = process.env.ADMIN_PASSWORD;
    const nodeEnv = process.env.NODE_ENV || 'development';

    if (nodeEnv === 'production' && (!envEmail || !envPassword)) {
        throw new Error(
            'ADMIN_EMAIL ve ADMIN_PASSWORD production ortaminda zorunludur.',
        );
    }

    const adminEmail = envEmail || 'admin@maptracking.com';
    const adminPassword = envPassword || 'Admin123!@#';

    // Admin kullanıcısı var mı kontrol et
    const adminExists = await userRepository.findOne({
        where: { email: adminEmail },
    });

    if (adminExists) {
        console.log('✅ Admin user already exists');
        return;
    }

    // Admin kullanıcısı oluştur
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const admin = userRepository.create({
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
    });

    await userRepository.save(admin);

    console.log('✅ Admin user created successfully');
    console.log(`📧 Email: ${adminEmail}`);
    console.log('🔑 Password: (hidden) - change immediately');
}
