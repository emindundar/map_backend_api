import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../modules/users/entities/user.entity';

export async function seedAdminUser(dataSource: DataSource) {
    const userRepository = dataSource.getRepository(User);

    // Admin kullanıcısı var mı kontrol et
    const adminExists = await userRepository.findOne({
        where: { email: 'admin@maptracking.com' },
    });

    if (adminExists) {
        console.log('✅ Admin user already exists');
        return;
    }

    // Admin kullanıcısı oluştur
    const passwordHash = await bcrypt.hash('Admin123!@#', 10);

    const admin = userRepository.create({
        email: 'admin@maptracking.com',
        passwordHash,
        role: UserRole.ADMIN,
    });

    await userRepository.save(admin);

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@maptracking.com');
    console.log('🔑 Password: Admin123!@# (CHANGE THIS IMMEDIATELY!)');
}
