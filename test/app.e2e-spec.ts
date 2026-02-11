import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/api/health (GET)', () => {
        return request(app.getHttpServer())
            .get('/api/health')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('status', 'ok');
                expect(res.body).toHaveProperty('timestamp');
            });
    });

    describe('Auth Module', () => {
        it('/api/auth/register (POST) - should register user', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('success', true);
                    expect(res.body).toHaveProperty('token');
                    expect(res.body).toHaveProperty('user');
                });
        });

        it('/api/auth/register (POST) - should fail with invalid email', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'password123',
                })
                .expect(400);
        });

        it('/api/auth/login (POST) - should login user', async () => {
            // First register
            await request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                });

            // Then login
            return request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('success', true);
                    expect(res.body).toHaveProperty('token');
                });
        });
    });
});
