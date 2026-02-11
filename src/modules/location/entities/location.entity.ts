import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('locations')
@Index(['user', 'createdAt'])
export class Location {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @Column('decimal', { precision: 10, scale: 7 })
    latitude: number;

    @Column('decimal', { precision: 10, scale: 7 })
    longitude: number;

    @Column('decimal', { precision: 5, scale: 2, nullable: true })
    accuracy: number;

    @Column('decimal', { precision: 6, scale: 2, nullable: true })
    speed: number;

    @Column('decimal', { precision: 5, scale: 2, nullable: true })
    heading: number;

    @Column('decimal', { precision: 8, scale: 2, nullable: true })
    altitude: number;

    @Column({ name: 'device_timestamp', type: 'timestamptz' })
    deviceTimestamp: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
