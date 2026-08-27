# SuperLink ISP CRM - Running Instructions

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL connection string
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```
Backend runs on **http://localhost:3002**

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:5175** (or next available port)

### Default Login
- **Email:** admin@superlinkit.com
- **Password:** SuperLink@2024!

---

## Features Implemented

### 1. Customer Management
- **Customers Page** (`/customers`) - List, search, filter, paginate
- **Customer Detail** (`/customers/:id`) - View sites, tickets, payments
- **Add/Edit Customer** - Modal forms with validation

### 2. Site Management
- **Sites Page** (`/sites`) - List with status badges, ISP, bandwidth
- **Site Detail** (`/sites/:id`) - Full details, credentials vault, GIS coordinates
- **Add/Edit Site** - Modal forms with connection type, pricing

### 3. ISP Directory
- **ISPs Page** (`/isps`) - Provider management with contact info, location

### 4. Ticketing System
- **Tickets Page** (`/tickets`) - Kanban-style or list view with filters
- **Ticket Detail** (`/tickets/:id`) - Full thread, messages, status/priority updates
- **Create/Edit Ticket** (`/tickets/new`, `/tickets/:id/edit`) - Modal forms
- **Real-time alerts** via Socket.io for new tickets

### 5. Payments & Billing
- **Payments Page** (`/payments`) - List with type filters (OTC, MRC, Static IP, Other)
- **Payment Detail** (`/payments/:id`)
- **Add/Edit Payment** (`/payments/new`, `/payments/:id/edit`)

### 6. Import / Export (`/import-export`)
- **Export** - Customers, Sites, Payments, Tickets to Excel
- **Import** - Customers and Sites with:
  - Template download
  - File upload with parsing preview
  - Validation preview before import
  - Execute import with error reporting

### 7. GIS Map (`/gis`)
- Leaflet map with site markers
- Color-coded by site status
- ISP POP locations
- Popups with customer/site details

### 8. Credentials Vault
- Encrypted storage (AES-256-GCM) for router credentials
- PPPoE credentials
- Static IP assignments
- Role-based reveal access

### 9. User Profile (`/profile`)
- **Profile tab** - Edit name, phone, view role/status
- **Security tab** - Change password, 2FA placeholder, session management

### 10. Settings (`/settings`)
- Application configuration
- User management (for SUPER_ADMIN/ISP_OWNER)

---

## Role-Based Access Control (RBAC)

| Role | Description |
|------|-------------|
| **SUPER_ADMIN** | Full system access, user/role management, audit logs |
| **ISP_OWNER** | Complete operational access, all modules |
| **SALES** | Customers, sites, tickets, quotations |
| **NOC** | Sites, tickets, GIS, credentials, feasibility |
| **FINANCE** | Payments, customers/sites read, import/export |
| **SUPPORT** | Tickets, customers/sites read |
| **CLIENT** | Own sites, tickets, payments, GIS (read-only) |

---

## API Endpoints

### Auth
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Current user
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/change-password` - Change password

### Customers
- `GET /api/v1/customers` - List with pagination/search
- `GET /api/v1/customers/:id` - Get single
- `POST /api/v1/customers` - Create
- `PATCH /api/v1/customers/:id` - Update
- `DELETE /api/v1/customers/:id` - Delete

### Sites
- `GET /api/v1/sites` - List with filters
- `GET /api/v1/sites/:id` - Get single
- `POST /api/v1/sites` - Create
- `PATCH /api/v1/sites/:id` - Update
- `DELETE /api/v1/sites/:id` - Delete

### Tickets
- `GET /api/v1/tickets` - List with filters
- `GET /api/v1/tickets/:id` - Get single
- `POST /api/v1/tickets` - Create
- `PUT /api/v1/tickets/:id` - Update
- `PATCH /api/v1/tickets/:id/status` - Update status
- `PATCH /api/v1/tickets/:id/priority` - Update priority
- `POST /api/v1/tickets/:id/assign` - Assign ticket
- `GET /api/v1/tickets/:id/messages` - Get messages
- `POST /api/v1/tickets/:id/messages` - Add message

### Import/Export
- `GET /api/v1/import-export/export/customers` - Export customers
- `GET /api/v1/import-export/export/sites` - Export sites
- `GET /api/v1/import-export/export/payments` - Export payments
- `GET /api/v1/import-export/export/tickets` - Export tickets
- `GET /api/v1/import-export/template/:type` - Download template
- `POST /api/v1/import-export/import/customers/preview` - Preview import
- `POST /api/v1/import-export/import/sites/preview` - Preview import
- `POST /api/v1/import-export/import/customers` - Execute import
- `POST /api/v1/import-export/import/sites` - Execute import

### GIS
- `GET /api/v1/gis/sites` - Sites for map
- `GET /api/v1/gis/map` - Map data with filters

### Credentials
- `GET /api/v1/credentials` - List all
- `GET /api/v1/credentials/sites/:siteId` - Get by site
- `POST /api/v1/credentials/sites/:siteId` - Create/update
- `POST /api/v1/credentials/sites/:siteId/reveal` - Reveal password
- `DELETE /api/v1/credentials/sites/:siteId` - Delete

### Users
- `GET /api/v1/users` - List users
- `GET /api/v1/users/:id` - Get user
- `POST /api/v1/users` - Create user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

---

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v4
- **State**: TanStack Query v5, React Context
- **Real-time**: Socket.io
- **Auth**: JWT (access 7d, refresh 30d)
- **Encryption**: AES-256-GCM for credentials
- **Excel**: SheetJS (xlsx)

---

## Project Structure

```
Superlink/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed script
│   ├── src/
│   │   ├── config/            # Env, DB config
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, RBAC, validation, error handling
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Helpers
│   │   └── server.ts          # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios, endpoints
│   │   ├── components/        # Reusable components
│   │   ├── context/           # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── pages/             # Page components
│   │   ├── types/             # TypeScript types
│   │   ├── App.tsx            # Routes
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Common Issues

### CORS Errors
- Backend CORS configured for any `http://localhost:*` in development
- Ensure frontend port matches (5173, 5174, 5175, etc.)

### Database Connection
- Verify PostgreSQL is running
- Check `.env` has correct `DATABASE_URL`

### Port Conflicts
- Backend: 3002 (change in `.env`)
- Frontend: Auto-selects available port (5173+)

### Build Errors
- Run `npm run build` in both folders to verify
- Check TypeScript errors are resolved

---

## Next Steps / Roadmap

1. **WhatsApp Business Cloud API** integration
2. **PDF Quotation Generator** with SuperLink branding
3. **Email notifications** for tickets/payments
4. **Customer portal** (CLIENT role full access)
5. **Advanced reporting** and dashboards
6. **Mobile app** (React Native)
7. **Automated backup** and monitoring