# 🗺️ Map Tracking Backend - NestJS

Production-ready REST API backend for map tracking applications with enterprise-grade security and performance.

## ✨ Features

- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Role-Based Authorization** - Admin and user role separation
- ✅ **Password Security** - Bcrypt hashing with salt rounds
- ✅ **Rate Limiting** - DDoS protection with throttling
- ✅ **Input Validation** - Class-validator with DTOs
- ✅ **Database Pooling** - Optimized PostgreSQL connections
- ✅ **Error Handling** - Global exception filters
- ✅ **Logging** - Structured logging with performance metrics
- ✅ **Docker Support** - Container-ready with docker-compose
- ✅ **Health Checks** - Application and database monitoring
- ✅ **API Documentation** - Swagger/OpenAPI integration
- ✅ **Type Safety** - Full TypeScript with strict mode
- ✅ **Testing** - Unit and E2E test infrastructure
- ✅ **WebSocket (Socket.IO)** - Real-time location tracking
- ✅ **Location Tracking** - Live user location with room-based subscription

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 10.x | Framework |
| TypeScript | 5.x | Language |
| PostgreSQL | 14+ | Database |
| TypeORM | 0.3.x | ORM |
| JWT | 9.x | Authentication |
| bcryptjs | 2.x | Password Hashing |
| class-validator | 0.14.x | Validation |
| Helmet | 7.x | Security Headers |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pnpm (recommended) or npm
- Docker (optional)

### Installation

1. **Clone repository:**
```bash
git clone <repository-url>
cd map-tracking-nestjs
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Setup environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start PostgreSQL:**
```bash
# Option 1: Docker
docker run --name map_tracking_postgres \
  -e POSTGRES_DB=map_tracking_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 -d postgres:14-alpine

# Option 2: Local PostgreSQL
createdb map_tracking_db
```

5. **Run database migrations:**
```bash
psql -d map_tracking_db -f src/database/migrations/init.sql
```

6. **Seed admin user:**
```bash
pnpm seed
```

7. **Start application:**
```bash
# Development
pnpm start:dev

# Production
pnpm build
pnpm start:prod
```

8. **Access application:**
- API: http://localhost:3000/api
- Health: http://localhost:3000/api/health
- Swagger: http://localhost:3000/api/docs (dev only)

## 🐳 Docker Deployment

### Quick Start with Docker Compose:
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Manual Docker Build:
```bash
# Build image
docker build -t map-tracking-nestjs .

# Run container
docker run -p 3000:3000 \
  -e JWT_SECRET=your-secret \
  -e DB_HOST=host.docker.internal \
  map-tracking-nestjs
```

## 📡 API Endpoints

### Authentication (Public)

**POST** `/api/auth/register`
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**POST** `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Users (Admin Only - Requires Bearer Token)

**GET** `/api/users/trackable` - Get trackable users (role: user)

**GET** `/api/users` - Get all users

**GET** `/api/users/:id` - Get user by ID

**GET** `/api/users/stats/count` - Get user statistics

**DELETE** `/api/users/:id` - Delete user

### Health

**GET** `/api/health` - Health check endpoint

### Location (Admin Only - Requires Bearer Token)

**GET** `/api/location/:userId/last` - Get user's last location

**GET** `/api/location/:userId/history?startDate=...&endDate=...&limit=50&offset=0` - Get location history

### WebSocket — Real-time Location (ws://SERVER/location)

> 📖 Client tarafı detaylı kullanım için: [LOCATION_README.md](src/modules/location/LOCATION_README.md)

| Event | Direction | Role | Description |
|---|---|---|---|
| `update_location` | Client → Server | User | Send location update |
| `location_updated` | Server → Client | Admin | Receive tracked user's location |
| `subscribe_user` | Client → Server | Admin | Start tracking a user |
| `unsubscribe_user` | Client → Server | Admin | Stop tracking a user |
| `get_online_users` | Client → Server | Admin | List online users |
| `ping` | Client → Server | Any | Connection health check |

## 🔒 Security Features

- **JWT Authentication** - Stateless token-based auth
- **Password Hashing** - bcrypt with 10 salt rounds
- **Input Validation** - Automatic DTO validation
- **SQL Injection Prevention** - Parameterized queries
- **Rate Limiting** - 10 requests per 60 seconds
- **Helmet Security** - HTTP security headers
- **CORS Protection** - Configurable origins
- **Global Exception Filter** - Secure error messages
- **Request Timeout** - 30-second timeout protection

## 🧪 Testing
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

## 📊 Performance

- **Database Connection Pooling** - Max 20 connections
- **Request Logging** - Response time tracking
- **Class Transformation** - Efficient serialization
- **TypeORM Optimizations** - Selective field loading

## 🔧 Development
```bash
# Development mode with hot reload
pnpm start:dev

# Debug mode
pnpm start:debug

# Lint code
pnpm lint

# Format code
pnpm format

# Build for production
pnpm build
```

## 📚 Project Structure
```
src/
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators
│   ├── filters/         # Exception filters
│   ├── guards/          # Auth guards
│   ├── interceptors/    # Interceptors
│   ├── interfaces/      # Common interfaces
│   └── middleware/      # Custom middleware
├── config/              # Configuration files
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── env.validation.ts
├── modules/             # Feature modules
│   ├── auth/            # Authentication
│   ├── users/           # User management
│   ├── health/          # Health checks
│   └── location/        # Real-time location tracking (WS + REST)
├── database/            # Database related
│   ├── migrations/      # SQL migrations
│   └── seeds/           # Database seeds
├── app.module.ts        # Root module
└── main.ts              # Application entry
```

## 🌍 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| NODE_ENV | Environment mode | development | No |
| PORT | Server port | 3000 | No |
| DB_HOST | Database host | - | Yes |
| DB_PORT | Database port | 5432 | No |
| DB_USERNAME | Database user | - | Yes |
| DB_PASSWORD | Database password | - | Yes |
| DB_DATABASE | Database name | - | Yes |
| JWT_SECRET | JWT secret key | - | Yes |
| JWT_EXPIRES_IN | Token expiration | 24h | No |
| THROTTLE_TTL | Rate limit TTL | 60 | No |
| THROTTLE_LIMIT | Rate limit count | 10 | No |

## 📝 Default Credentials

After seeding:
- **Email:** admin@maptracking.com
- **Password:** Admin123!@#

⚠️ **IMPORTANT:** Change these credentials immediately in production!

## 🚨 Production Checklist

- [ ] Change default admin credentials
- [ ] Set strong JWT_SECRET (256-bit random)
- [ ] Configure ALLOWED_ORIGINS for CORS
- [ ] Enable SSL for database
- [ ] Set NODE_ENV=production
- [ ] Disable Swagger in production
- [ ] Configure proper logging
- [ ] Set up monitoring
- [ ] Enable database backups
- [ ] Configure rate limiting
- [ ] Review security headers

## 📄 License

MIT

## 👨‍💻 Author

Emin Dundar

---

Made with ❤️ using NestJS and TypeScript
