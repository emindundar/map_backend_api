# Production Deployment Checklist

## Pre-Deployment

- [ ] Set strong `JWT_SECRET` (256-bit random string)
- [ ] Set `NODE_ENV=production`
- [ ] Configure database with SSL
- [ ] Set appropriate `JWT_EXPIRES_IN`
- [ ] Configure CORS for specific origins
- [ ] Set up rate limiting values
- [ ] Enable database backups
- [ ] Configure logging aggregation
- [ ] Set up monitoring (e.g., PM2, Prometheus)

## Docker Deployment
```bash
# 1. Build image
docker build -t map-tracking-nestjs:v1.0.0 .

# 2. Run with docker-compose
docker-compose up -d

# 3. Check logs
docker-compose logs -f app

# 4. Health check
curl http://localhost:3000/api/health
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] Helmet middleware active
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] SQL injection protection (TypeORM parameterized queries)
- [ ] Password hashing (bcrypt)
- [ ] JWT token expiration set
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Database credentials rotated

## Monitoring

- [ ] Set up health check endpoint monitoring
- [ ] Configure application logging
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Monitor database performance
- [ ] Track API response times
