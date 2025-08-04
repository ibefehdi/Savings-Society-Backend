# Savings Society Backend API Documentation

**Version:** 1.0.0  
**Author:** Fahad Asad (@Ibefehdi)  
**Description:** Backend for shareholder application for Co-Operative Society Saving For Kuwaiti Government Staff

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [Authentication & Security](#authentication--security)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [File Upload](#file-upload)
8. [Error Handling](#error-handling)
9. [Logging & Monitoring](#logging--monitoring)

## Overview

This is a comprehensive financial management system for a Kuwaiti savings society (cooperative) that also manages rental properties. The system handles:

- **Financial Management**: Shareholder accounts, savings, shares, and amanat (high-tier deposits)
- **Property Management**: Buildings, flats, tenants, and rental contracts
- **Event Management**: Hall bookings for events
- **Financial Reporting**: Comprehensive reports with Arabic language support
- **User Management**: Role-based access control with granular permissions

## Architecture

### Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js (Local Strategy) + JWT
- **Validation**: Joi + Express Validator
- **File Upload**: Multer
- **Logging**: Winston with MongoDB transport
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, XSS protection, bcrypt for password hashing

### Project Structure

```
├── controllers/          # Business logic controllers
├── middleware/           # Custom middleware (validation, auth)
├── models/              # Mongoose schemas/models
├── routes/              # Express route definitions
├── utils/               # Utilities (logging, swagger)
├── validationModels/    # Joi validation schemas
├── migrations/          # Database migration scripts
├── uploads/             # File upload directory
│   ├── civilIDs/       # Civil ID documents
│   └── contracts/      # Contract documents
└── index.js            # Application entry point
```

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB instance
- Environment variables configuration

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file with:

```bash
MONGODB_CONNECTION_STRING=your_mongodb_connection_string
PORT=8081
PASSPORT_SECRET=your_passport_secret
SCHEDULER=DAILY  # or yearly for production
AUTOMATIC_GENERATION=TRUE  # for automatic voucher generation
```

### Running the Application

```bash
# Development
npm run nodemon

# Production
npm start
```

### API Documentation

Visit `http://localhost:8081/api-docs` for Swagger documentation.

## Authentication & Security

### Authentication Methods

1. **Session-based Authentication**: Using Passport.js Local Strategy
2. **JWT Tokens**: For stateless API access

### User Roles & Permissions

The system supports granular role-based access control:

```javascript
permissions: {
  shareholder: { create, view, edit, delete },
  user: { create, view, edit, delete },
  deposit: { shares, savings },
  withdrawal: { shares, savings },
  financialConfiguration: { shares, savings },
  amanat: { create, view, edit, delete }
}
```

### Security Features

- Password hashing with bcrypt
- XSS protection on all inputs
- Session management with secure cookies
- Request/response logging
- File upload validation
- CORS configuration

## Database Schema

### Core Business Models

#### Shareholder
- **Purpose**: Central member management
- **Key Fields**: Personal info, membership details, financial references
- **Relationships**: → Address, Share, Savings, User

#### Savings
- **Purpose**: Individual savings accounts with interest calculation
- **Key Fields**: deposits[], totalAmount, savingsIncrease, amanat reference
- **Business Logic**: Auto-transfer to Amanat when exceeding 1000 KD

#### Share
- **Purpose**: Share investments with interest tracking
- **Key Fields**: purchases[], totalAmount, shareIncrease, serial
- **Business Logic**: Daily serial number generation

#### Amanat
- **Purpose**: High-tier investment (promoted from savings)
- **Key Fields**: amount, withdrawn, date, year

### Property Management Models

#### Building → Flat → Tenant → Contract
- Hierarchical relationship for property management
- Contract lifecycle management with automatic history creation

#### Booking
- Event hall booking system with conflict detection
- Integrated payment voucher generation

### Configuration & History

- **Config Models**: SavingsConfig, ShareConfig for yearly interest rates
- **History Models**: DepositHistory, WithdrawalHistory, TenantHistory
- **Logging Models**: TransferLog, WithdrawalLog for audit trails

## API Endpoints

### Base URL: `/api/v1`

### Authentication Endpoints

```http
POST /api/v1/users/signin          # User login
POST /api/v1/users/signup          # User registration (admin only)
```

### Shareholder Management

```http
# Core CRUD
GET    /api/v1/shareholders         # List shareholders with pagination & filters
POST   /api/v1/shareholder          # Create shareholder
GET    /api/v1/shareholder/:id      # Get shareholder by ID
PUT    /api/v1/shareholder/:id      # Update shareholder

# Financial Operations
POST   /api/v1/shareholder/depositsavings/:id     # Deposit to savings
POST   /api/v1/shareholder/depositshares/:id      # Deposit to shares
POST   /api/v1/shareholder/withdrawsavings/:id    # Withdraw from savings
POST   /api/v1/shareholder/withdrawshares/:id     # Withdraw from shares
POST   /api/v1/shareholder/withdrawamanat/:id     # Withdraw from amanat

# Advanced Operations
POST   /api/v1/shareholder/movesavingstoamanat/:id           # Move savings to amanat
POST   /api/v1/shareholder/moveinteresttosavings/:id         # Move interest to savings
POST   /api/v1/shareholder/:id/force-increment               # Force apply increment
POST   /api/v1/shareholder/:id/calculate-potential-increment # Calculate potential increment

# Reports & Export
GET    /api/v1/shareholdercsv/                    # Export shareholders CSV
GET    /api/v1/shareholder-amanat-report         # Amanat report export
GET    /api/v1/transfer-log-report               # Transfer log export
GET    /api/v1/shareholder-share/                # Shares export
GET    /api/v1/shareholder-savings/              # Savings export

# Utilities
POST   /api/v1/shareholderbymemberscode          # Get by members code
GET    /api/v1/shareholdercount/                 # Count all shareholders
GET    /api/v1/shareholderactivecount/           # Count active shareholders
```

### Property Management

#### Buildings
```http
GET    /api/v1/buildings                        # List all buildings
POST   /api/v1/createbuilding                   # Create building
PUT    /api/v1/editbuilding/:id                 # Update building
DELETE /api/v1/deletebuilding/:id               # Delete building
GET    /api/v1/halls                           # List halls only
GET    /api/v1/building-export                 # Export buildings
```

#### Flats
```http
GET    /api/v1/flats                           # List all flats
POST   /api/v1/createflat                      # Create flat (with file upload)
PUT    /api/v1/flat/:id                        # Update flat
PUT    /api/v1/addtenant/:id                   # Assign tenant to flat
PUT    /api/v1/replacetenant/:id               # Replace tenant
GET    /api/v1/flatsbybuildingid/:buildingId   # Flats by building
GET    /api/v1/flatcsv/:buildingId             # Export flats CSV
```

#### Tenants
```http
GET    /api/v1/tenants                         # List all tenants
GET    /api/v1/active_tenants                  # List active tenants
PUT    /api/v1/editTenant/:id                  # Update tenant (with file upload)
DELETE /api/v1/deleteTenant/:tenantId          # Deactivate tenant
POST   /api/v1/tenantsbycivilid                # Find by civil ID
```

#### Contracts
```http
GET    /api/v1/contracts                       # List all contracts
GET    /api/v1/contracts/active                # Active contracts
GET    /api/v1/contracts/inactive              # Inactive contracts
GET    /api/v1/contracts/export                # Export contracts CSV
DELETE /api/v1/contract/:id                    # Delete contract
```

#### Bookings (Event Halls)
```http
POST   /api/v1/createbooking                   # Create booking (with file upload)
PUT    /api/v1/editbooking/:id                 # Update booking
POST   /api/v1/cancelbooking                   # Cancel booking
GET    /api/v1/bookingbydate                   # Get bookings by date
GET    /api/v1/bookingbyhall/:hallId           # Bookings by hall
GET    /api/v1/bookings/:hallId/export         # Export bookings CSV
```

### Financial Management

#### Transactions
```http
GET    /api/v1/transactions                    # List all transactions
POST   /api/v1/createtransaction               # Create transaction
GET    /api/v1/transactions/:type              # Filter by type
GET    /api/v1/transactionsexport              # Export transactions
GET    /api/v1/profit-report/export            # Profit report
GET    /api/v1/date-range/transactions         # Filter by date range
```

#### Vouchers (Payment Management)
```http
GET    /api/v1/vouchers                        # List all vouchers
POST   /api/v1/createvoucher                   # Create voucher
POST   /api/v1/voucherpaid/:id                 # Mark as paid
PUT    /api/v1/updatevoucher/:id               # Update voucher
GET    /api/v1/vouchers/pending                # Pending vouchers
GET    /api/v1/vouchers/paid                   # Paid vouchers
GET    /api/v1/voucher-report                  # Voucher report
```

#### Configuration
```http
# Savings Configuration
GET    /api/v1/savingconfigs                   # List savings configs
POST   /api/v1/createsavingconfig              # Create config
PUT    /api/v1/savingconfig/:id                # Update config

# Share Configuration
GET    /api/v1/shareconfigs                    # List share configs
POST   /api/v1/createshareconfig               # Create config
PUT    /api/v1/shareconfig/:id                 # Update config
```

### Reports & Analytics

#### Financial Reports
```http
GET    /api/v1/financialReports                # Shareholder reports
GET    /api/v1/financialReports/export         # Export shareholder reports
GET    /api/v1/financialreportsbyyear          # Reports by year
GET    /api/v1/financialreportsofquiters       # Quit shareholders
GET    /api/v1/financialreportofuser/:id       # User-specific report
GET    /api/v1/financialreportbyworkplace      # Reports by workplace
GET    /api/v1/financialreportsbyamanat        # Amanat reports
```

#### History & Audit
```http
GET    /api/v1/deposithistory                  # Deposit history
GET    /api/v1/deposit-history-report          # Deposit report
GET    /api/v1/withdrawalhistory               # Withdrawal history
GET    /api/v1/withdrawal-history-report       # Withdrawal report
GET    /api/v1/TransferHistory                 # Transfer logs
```

### System Management

#### Users
```http
GET    /api/v1/users/                          # List users
GET    /api/v1/userscount/                     # User count
GET    /api/v1/activeuserscount/               # Active users
PUT    /api/v1/user/:id                        # Update user
GET    /api/v1/deleteuser/:id                  # Deactivate user
```

#### Logs
```http
GET    /api/v1/logs                            # System logs
GET    /api/v1/logs/search                     # Search logs
```

#### Utilities
```http
GET    /api/v1/workplaces                      # List workplaces
POST   /api/v1/workplace                       # Create workplace
POST   /api/v1/receipt-voucher-serials         # Increment voucher serial
```

## File Upload

### Supported File Types
- Civil ID documents (PDF, images)
- Contract documents (PDF)

### Upload Endpoints

#### Flats (Multiple files)
```http
POST /api/v1/createflat
PUT  /api/v1/flat/:id
PUT  /api/v1/addtenant/:id

Fields:
- civilIdDocument (max 1 file)
- contractDocument (max 1 file)
```

#### Bookings (Civil ID only)
```http
POST /api/v1/createbooking

Fields:
- civilIdDocument (max 1 file)
```

#### Tenants (Civil ID only)
```http
PUT /api/v1/editTenant/:id

Fields:
- civilIdDocument (max 1 file)
```

### File Storage

Files are stored in:
- `/uploads/civilIDs/` - Civil ID documents
- `/uploads/contracts/` - Contract documents

Naming convention: `timestamp_originalname.extension`

## Error Handling

### Standard Error Response

```json
{
  "error": "Error description - الوصف بالعربية",
  "missing": ["field1", "field2"],  // For validation errors
  "message": "Detailed error message"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

### Validation Errors

The system uses Joi validation and returns detailed error messages:

```json
{
  "error": "Missing required fields - الحقول الإلزامية مفقودة",
  "missing": ["fName", "civilId"]
}
```

## Logging & Monitoring

### Winston Logger Configuration

- **Transport**: MongoDB
- **Collection**: `logs`
- **Format**: JSON with timestamps
- **Level**: Info and above

### Automatic Logging

The system automatically logs:
- All HTTP requests and responses
- Database operations
- File uploads
- Error occurrences
- User authentication attempts

### Scheduled Tasks

#### Daily Interest Calculation
```javascript
// Runs based on SCHEDULER environment variable
// Updates current prices for all shares and savings
```

#### Monthly Voucher Generation
```javascript
// Runs on 25th of each month at 23:59
// Creates pending vouchers for all active contracts
```

### Log Access

```http
GET /api/v1/logs?page=1&limit=50       # Paginated logs
GET /api/v1/logs/search?query=error    # Search logs
```

## Business Rules

### Financial Rules

1. **Savings to Amanat**: Savings automatically transfer to Amanat when exceeding 1000 KD
2. **Interest Calculation**: Complex monthly calculations with 2024 correction algorithms
3. **Serial Numbers**: Daily sequential numbering for shares
4. **Member Codes**: Auto-incrementing unique member identification

### Property Rules

1. **Contract Lifecycle**: Expired contracts automatically create history records
2. **Booking Conflicts**: System prevents double-booking of halls
3. **Voucher Generation**: Automatic monthly voucher creation for active contracts
4. **File Management**: Automatic directory creation and file naming

### Data Integrity

1. **Audit Trails**: All financial operations track admin user
2. **Historical Records**: Comprehensive history maintenance
3. **Duplicate Prevention**: Shareholder and voucher duplicate detection
4. **Referential Integrity**: Proper foreign key relationships maintained

## API Testing

### Swagger Documentation
- Available at: `http://localhost:8081/api-docs`
- Interactive API testing interface
- Complete schema definitions

### Sample Requests

#### Create Shareholder
```bash
curl -X POST http://localhost:8081/api/v1/shareholder \
  -H "Content-Type: application/json" \
  -d '{
    "fName": "Ahmed",
    "lName": "Al-Rashid",
    "civilId": "123456789",
    "joinDate": "2024-01-01",
    "status": 0,
    "adminId": ["admin_user_id"],
    "gender": "male"
  }'
```

#### Get Shareholders with Filtering
```bash
curl "http://localhost:8081/api/v1/shareholders?page=1&resultsPerPage=10&status=0&gender=male"
```

## Performance Considerations

1. **Pagination**: All list endpoints support pagination
2. **Indexing**: Proper database indexing on frequently queried fields
3. **File Storage**: Organized file directory structure
4. **Scheduled Tasks**: Optimized for off-peak execution
5. **Connection Pooling**: MongoDB connection optimization

## Internationalization

- **Arabic Language Support**: Error messages, reports, and UI text
- **RTL Support**: Excel reports formatted for Arabic reading
- **Date Formatting**: Middle Eastern locale support
- **Currency**: Kuwaiti Dinar (KD) formatting

## Security Best Practices

1. **Input Sanitization**: XSS protection on all inputs
2. **Password Security**: bcrypt hashing with salt
3. **Session Security**: Secure cookie configuration
4. **File Upload Security**: Type and size validation
5. **Environment Variables**: Sensitive data protection
6. **CORS Configuration**: Proper cross-origin settings

---

**Support**: For technical support, contact the development team or refer to the system logs for troubleshooting information.