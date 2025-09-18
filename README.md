# LedgerLoop XRPL Backend

A Node.js backend service for XRPL testnet integration, providing lending circle functionality with multi-signature wallets, escrow-based loan management, and automated contribution tracking.

## Features

- **Multi-signature Wallet Creation**: Create and manage multi-signature wallets for lending circles
- **Escrow-based Loan Management**: Secure loan disbursement using XRPL escrow functionality
- **Automated Contribution Tracking**: Monitor and record member contributions automatically
- **Member Verification System**: Verify members and manage their participation status
- **Interest Calculations**: Basic interest calculation utilities for loans
- **Transaction Monitoring**: Real-time transaction monitoring and storage
- **REST API**: Comprehensive REST API for frontend integration
- **XRPL Address Validation**: Validate XRPL addresses and account information
- **Transaction Signing Workflows**: Secure transaction signing and submission

## Prerequisites

- Node.js 16+ 
- npm or yarn
- XRPL testnet access

## Installation

1. Clone the repository:
```bash
git clone https://github.com/LedgerCircle/XRPL-integration.git
cd XRPL-integration
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration (the defaults work for development)

5. Start the server:
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

## API Documentation

The API is available at `http://localhost:3000/api` with comprehensive endpoint documentation.

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)
- `POST /api/auth/fund-wallet` - Fund testnet wallet (requires auth)
- `POST /api/auth/verify` - Verify user (requires auth)

### Lending Circle Endpoints

- `POST /api/circles` - Create lending circle (requires auth)
- `GET /api/circles` - Get all circles (requires auth)
- `GET /api/circles/my-circles` - Get user circles (requires auth)
- `GET /api/circles/:id` - Get circle details (requires auth)
- `GET /api/circles/:id/members` - Get circle members (requires auth)
- `POST /api/circles/join` - Join circle (requires auth)
- `POST /api/circles/:id/setup-multisig` - Setup multi-signature (requires auth)
- `POST /api/circles/contribution` - Record contribution (requires auth)
- `GET /api/circles/calculate-interest` - Calculate interest (requires auth)
- `PATCH /api/circles/:id/status` - Update circle status (requires auth)

### XRPL Utility Endpoints

- `POST /api/xrpl/validate-address` - Validate XRPL address
- `GET /api/xrpl/account/:address` - Get account information
- `GET /api/xrpl/transactions/:address` - Get transaction history
- `POST /api/xrpl/escrow/create` - Create escrow (requires auth)
- `POST /api/xrpl/escrow/finish` - Finish escrow (requires auth)
- `POST /api/xrpl/payment` - Send payment (requires auth)
- `GET /api/xrpl/stored-transactions` - Get stored transactions (requires auth)
- `POST /api/xrpl/subscribe` - Subscribe to address updates (requires auth)

## Usage Examples

### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "securepassword"
  }'
```

### Create a Lending Circle

```bash
curl -X POST http://localhost:3000/api/circles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Monthly Savings Circle",
    "description": "A group for monthly savings",
    "maxMembers": 10,
    "contributionAmount": 100,
    "contributionFrequency": "monthly",
    "interestRate": 0.05
  }'
```

### Validate XRPL Address

```bash
curl -X POST http://localhost:3000/api/xrpl/validate-address \
  -H "Content-Type: application/json" \
  -d '{
    "address": "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH"
  }'
```

## Database Schema

The application uses SQLite with the following main tables:

- **users**: User accounts and XRPL wallet information
- **lending_circles**: Lending circle configurations
- **circle_members**: Member participation in circles
- **contributions**: Member contribution records
- **loans**: Loan records and status
- **transactions**: XRPL transaction monitoring

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- XRPL address validation
- Input validation with Joi
- Security headers with Helmet
- CORS configuration
- Rate limiting ready

## Environment Configuration

Key environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `XRPL_SERVER`: XRPL server URL (default: testnet)
- `DB_PATH`: SQLite database path
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: Token expiration time

## Development

The project follows a modular structure:

```
src/
├── controllers/     # Request handlers
├── models/         # Data models
├── routes/         # API routes
├── middleware/     # Custom middleware
├── utils/          # Utility functions
└── database/       # Database setup
```

## XRPL Integration

The application integrates with XRPL testnet for:

- Wallet creation and management
- Multi-signature setup
- Escrow creation and execution
- Payment processing
- Transaction monitoring
- Account information retrieval

## Grant Demo Features

This MVP includes all features needed for a grant demonstration:

1. **User Registration & Wallet Creation**: Automatic XRPL wallet generation
2. **Lending Circle Management**: Create and join circles with contribution tracking
3. **Multi-signature Security**: Secure fund management with member consensus
4. **Escrow-based Loans**: Automated loan disbursement with conditions
5. **Real-time Monitoring**: Transaction tracking and status updates
6. **Interest Calculations**: Basic interest computation for loans
7. **REST API**: Complete API for frontend integration

## Testing

Run tests with:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue on the GitHub repository.