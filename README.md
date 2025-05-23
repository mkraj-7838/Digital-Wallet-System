# Digital Wallet API

A secure and scalable RESTful API for a digital wallet system, built with Node.js, Express, and MongoDB. This project supports user authentication, wallet operations (deposit, withdraw, transfer), transaction history, fraud detection, and admin reporting. It’s designed for developers to integrate a virtual wallet system with multi-currency support and robust security features.

## Table of Contents
- [Features](#features)
- [Technologies](#technologies)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Wallet Operations](#wallet-operations)
  - [Admin Operations](#admin-operations)
- [Postman Collection](#postman-collection)
- [Fraud Detection](#fraud-detection)
- [Soft Delete](#soft-delete)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Contributing](#contributing)

## Features
- **User Authentication**:
  - Register and login with secure password hashing (bcrypt).
  - JWT-based session management.
  - Protected endpoints with authentication middleware.
- **Wallet Operations**:
  - Deposit and withdraw virtual cash.
  - Transfer funds between users.
  - Multi-currency support (USD, EUR, GBP, JPY).
  - Transaction history with pagination.
- **Transaction Processing**:
  - Input validation to prevent overdrafts, negative deposits, or invalid transfers.
  - Sequential updates for data consistency on standalone MongoDB.
- **Fraud Detection**:
  - Real-time checks for suspicious transactions (e.g., large amounts, multiple failed attempts).
  - Daily scheduled scans to flag anomalies (e.g., excessive transfers, large withdrawals).
- **Admin APIs**:
  - View flagged transactions.
  - Aggregate total balances by currency.
  - List top users by balance or transaction volume.
  - Soft delete users and transactions.
- **Soft Delete**:
  - Mark users and transactions as deleted without permanent removal.
- **Scheduled Jobs**:
  - Daily fraud scans at midnight to identify and flag suspicious transactions.

## Technologies
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (standalone, no replica set required)
- **Authentication**: JSON Web Tokens (JWT), bcrypt
- **Dependencies**:
  - `express`: Web framework
  - `mongoose`: MongoDB ORM
  - `bcryptjs`: Password hashing
  - `jsonwebtoken`: JWT authentication
  - `dotenv`: Environment variable management
- **Development Tools**:
  - Postman: API testing
  - MongoDB Compass: Database management (optional)

## Project Structure
```plaintext
digital-wallet/
├── config/
│   └── config.js             # Environment variable configuration
├── controllers/
│   ├── adminController.js    # Admin API logic
│   ├── authController.js     # Authentication logic
│   └── walletController.js   # Wallet operation logic
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── fraudDetection.js    # Fraud detection middleware
├── models/
│   ├── Transaction.js       # Transaction schema
│   └── User.js              # User schema
├── routes/
│   ├── adminRoutes.js       # Admin API routes
│   ├── authRoutes.js        # Authentication routes
│   └── walletRoutes.js      # Wallet operation routes
├── utils/
│   └── fraudScanner.js      # Scheduled fraud detection logic
├── public/
│   └── index.html           # Static frontend (placeholder)
├── app.js                # Main server file
├── .env                     # Environment variables (not in repo)
├── package.json             # Project metadata and dependencies
└── README.md                # Project documentation
```

## Setup Instructions
### Prerequisites
- **Node.js**: v14 or higher
- **MongoDB**: v4.4 or higher (standalone instance)
- **Postman**: For API testing
- **Git**: For cloning the repository

### Installation
1. **Clone the Repository**:
   ```bash
   git clone [https://github.com/your-username/digital-wallet.git](https://github.com/mkraj-7838/Digital-Wallet-System)
   cd digital-wallet
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up MongoDB**:
   - Install MongoDB locally or use a cloud service (e.g., MongoDB Atlas).
   - Start MongoDB:
     ```bash
     mongod
     ```
   - Ensure MongoDB is running at `mongodb://localhost:27017`.

4. **Create `.env` File**:
   - Create a `.env` file in the root directory with the following:
     ```plaintext
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/digital-wallet
     JWT_SECRET=your-secret-key
     JWT_EXPIRES_IN=24h
     RATE_LIMIT_WINDOW=900000
     RATE_LIMIT_MAX=100
     MIN_TRANSACTION_AMOUNT=1
     MAX_TRANSACTION_AMOUNT=10000
     MAX_DAILY_TRANSFER_LIMIT=50000
     ```

5. **Start the Server**:
   ```bash
   npm start
   ```
   - The server will run at `http://localhost:5000`.

## Environment Variables
| Variable                  | Description                                    | Default Value                  |
|---------------------------|------------------------------------------------|--------------------------------|
| `PORT`                    | Server port                                    | `5000`                         |
| `MONGODB_URI`             | MongoDB connection string                      | `mongodb://localhost:27017/digital-wallet` |
| `JWT_SECRET`              | Secret key for JWT signing                     | `your-secret-key`              |
| `JWT_EXPIRES_IN`          | JWT token expiration time                      | `24h`                          |
| `RATE_LIMIT_WINDOW`       | Rate limit window (ms)                         | `900000` (15 minutes)          |
| `RATE_LIMIT_MAX`          | Max requests per window                        | `100`                          |
| `MIN_TRANSACTION_AMOUNT`  | Minimum transaction amount                     | `1`                            |
| `MAX_TRANSACTION_AMOUNT`  | Maximum transaction amount                     | `10000`                        |
| `MAX_DAILY_TRANSFER_LIMIT`| Maximum daily transfer limit                   | `50000`                        |

## API Endpoints
### Authentication
| Method | Endpoint                  | Description                           | Headers                     | Body Example                              |
|--------|---------------------------|---------------------------------------|-----------------------------|-------------------------------------------|
| POST   | `/api/auth/register`      | Register a new user                   | `Content-Type: application/json` | `{"username": "testuser", "email": "test@example.com", "password": "password123"}` |
| POST   | `/api/auth/login`         | Login and get JWT token               | `Content-Type: application/json` | `{"email": "test@example.com", "password": "password123"}` |
| GET    | `/api/auth/user`          | Get current user info                 | `Authorization: Bearer <token>` | -                                         |

### Wallet Operations
All endpoints require `Authorization: Bearer <token>` header.

| Method | Endpoint                     | Description                           | Body Example                              |
|--------|------------------------------|---------------------------------------|-------------------------------------------|
| POST   | `/api/wallet/deposit`        | Deposit funds                         | `{"amount": 100, "currency": "USD", "description": "Initial deposit"}` |
| POST   | `/api/wallet/withdraw`       | Withdraw funds                        | `{"amount": 50, "currency": "USD", "description": "Cash withdrawal"}` |
| POST   | `/api/wallet/transfer`       | Transfer funds to another user        | `{"amount": 25, "receiverEmail": "receiver@example.com", "currency": "USD", "description": "Peer transfer"}` |
| GET    | `/api/wallet/balance`        | Get wallet balance                    | -                                         |
| GET    | `/api/wallet/transactions`   | Get transaction history (paginated)   | Query: `?page=1&limit=50`                 |

### Admin Operations
All endpoints require `Authorization: Bearer <admin_token>` header (admin user with `isAdmin: true`).

| Method | Endpoint                             | Description                           | Query Parameters                     |
|--------|--------------------------------------|---------------------------------------|--------------------------------------|
| GET    | `/api/admin/flagged-transactions`    | Get flagged transactions              | `page=1`, `limit=50`                 |
| GET    | `/api/admin/total-balances`          | Get total balances by currency        | -                                    |
| GET    | `/api/admin/top-users/balance`       | Get top users by balance              | `currency=USD`, `limit=10`           |
| GET    | `/api/admin/top-users/volume`        | Get top users by transaction volume   | `currency=USD`, `limit=10`           |
| DELETE | `/api/admin/users/:userId`           | Soft delete a user                    | -                                    |
| DELETE | `/api/admin/transactions/:transactionId` | Soft delete a transaction         | -                                    |

## Postman Collection
A Postman collection is provided for testing all API endpoints:
- **File**: `DigitalWalletAPI.postman_collection.json`
- **Import Instructions**:
  1. Open Postman.
  2. Click "Import" > "Raw Text".
  3. Paste the JSON from the collection file.
  4. Set environment variables:
     - `jwt_token`: Token from `/api/auth/login`.
     - `admin_jwt_token`: Token from admin user login.
     - `userId`: User ID for deletion.
     - `transactionId`: Transaction ID for deletion.
- **Usage**:
  - Start with `/api/auth/register` and `/api/auth/login`.
  - Use the returned token for wallet and admin endpoints.
  - Update `receiverEmail`, `userId`, and `transactionId` with actual values.

## Fraud Detection
- **Real-Time Checks**:
  - Validates transaction amounts (`MIN_TRANSACTION_AMOUNT` to `MAX_TRANSACTION_AMOUNT`).
  - Blocks multiple failed attempts (≥3 in 24 hours).
  - Enforces daily transfer limits (`MAX_DAILY_TRANSFER_LIMIT`).
  - Collects metadata (IP, user agent) for tracking.
- **Scheduled Scans**:
  - Runs daily at midnight (`fraudScanner.js`).
  - Flags transactions for:
    - Excessive transfers (>10 in 24 hours).
    - Large withdrawals (>80% of `MAX_TRANSACTION_AMOUNT`).
    - Multiple failed attempts (≥3).
  - Updates transactions with `isFraudulent: true` and `fraudReason`.

## Soft Delete
- **Users**: Marked with `isDeleted: true` and `isActive: false` via `/api/admin/users/:userId`.
- **Transactions**: Marked with `isDeleted: true` via `/api/admin/transactions/:transactionId`.
- **Behavior**: Deleted records are excluded from queries and authentication checks.

## Running the Application
1. **Start MongoDB**:
   ```bash
   mongod
   ```
2. **Start the Server**:
   ```bash
   npm start
   ```
3. **Access**:
   - API: `http://localhost:5000`
   - Static frontend (placeholder): `http://localhost:5000`

## Testing
- **Unit Tests**: Not included; recommended to add with Jest or Mocha.
- **Manual Testing**:
  - Use the Postman collection to test all endpoints.
  - Example workflow:
    1. Register a user.
    2. Login and save the token.
    3. Deposit funds.
    4. Transfer to another user.
    5. Check balance and transaction history.
    6. Use admin token to view reports and delete records.
- **Fraud Detection**:
  - Test large deposits (>10000) to trigger amount validation.
  - Simulate multiple failed transfers to trigger fraud detection.
- **Database**:
  - Use MongoDB Compass to inspect `users` and `transactions` collections.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

---
**Developed by**: Mohit Kumar  
**Contact**: mohit.work.mail9@gmail.com  
**Repository**: [https://github.com/mkraj-7838/digital-wallet](https://github.com/mkraj-7838/Digital-Wallet-System)
