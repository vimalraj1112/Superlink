# SuperLink ISP CRM - WaveTrack Replacement

Enterprise-grade ISP Customer Relationship Management and Ticketing System built with PERN stack (PostgreSQL, Express, React, Node.js) + TypeScript.

## 🚀 Features

### Core Modules
- **Customer Management** - Complete CRUD with sites, tickets, payments history
- **Site Directory** - ISP links, connection types, status lifecycle, GIS coordinates
- **Ticketing System** - Multi-source (Manual/Telegram/WhatsApp), SLA tracking, real-time alerts
- **Billing & Payments** - OTC, MRC, Static IP, renewals, invoice management
- **GIS Map** - Leaflet-based site visualization with status color-coding
- **Credentials Vault** - AES-256-GCM encrypted router/PPPoE credentials
- **Import/Export** - Excel templates with validation preview
- **Role-Based Access** - 7 roles with granular permissions
- **Real-time** - Socket.io for live ticket updates

### Technical Highlights
- **Standardized API** - `{ success, message, data, meta }` response envelope
- **JWT Auth** - Access (7d) + Refresh (30d) tokens with rotation
- **Audit Logging** - Immutable mutation history
- **TypeScript** - Full type safety across stack
- **Tailwind CSS v4** - Modern utility-first styling

## 📦 Quick Start

```bash
# Backend
cd backend
cp .env.example .env
# Edit DATABASE_URL in .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev  # http://localhost:3002

# Frontend (new terminal)
cd frontend
npm install
npm run dev  # http://localhost:5175
```

**Default Login:** `admin@superlinkit.com` / `SuperLink@2024!`

See [RUNNING.md](RUNNING.md) for detailed instructions.

## 🏗 Architecture

```
Superlink/
├── backend/
│   ├── prisma/schema.prisma     # 12 models: User, Role, Customer, Site, ISP,
│   │                            # SiteCredential, Payment, Ticket, TicketMessage,
│   │                            # ChatSession, ChatMessage, AuditLog, Quotation
│   ├── src/
│   │   ├── controllers/         # 9 controllers
│   │   ├── middleware/          # auth, rbac, validate, errorHandler, auditLogger
│   │   ├── routes/              # 12 route groups
│   │   ├── services/            # encryption, sla, telegram, chatAgent, excel, socket
│   │   └── server.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                 # axios + endpoints
│   │   ├── components/          # forms, common, layout, map, tickets
│   │   ├── context/             # AuthContext, SocketContext
│   │   ├── hooks/               # useCustomers, useSites, useTickets, etc.
│   │   ├── pages/               # 14 pages
│   │   └── types/               # models, enums, api
│   └── package.json
└── README.md
```

## 🔐 RBAC Roles

| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | All + user/role management, audit logs |
| ISP_OWNER | All operational modules |
| SALES | Customers, sites, tickets, quotations |
| NOC | Sites, tickets, GIS, credentials |
| FINANCE | Payments, import/export, read customers/sites |
| SUPPORT | Tickets, read customers/sites |
| CLIENT | Own sites/tickets/payments (read) |

## 📡 API Groups

```
/api/v1/auth          # Login, refresh, me, logout
/api/v1/users         # User management (admin)
/api/v1/customers     # Customer CRUD
/api/v1/sites         # Site CRUD
/api/v1/isps          # ISP directory
/api/v1/tickets       # Ticket CRUD + messages + assign/status
/api/v1/payments      # Payment CRUD
/api/v1/gis           # Map data, site/ISP listings
/api/v1/credentials   # Encrypted vault
/api/v1/import-export # Excel import/export
/api/v1/dashboard     # Stats, renewals, charts
/api/v1/webhooks/telegram  # Telegram bot webhook
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Database | PostgreSQL 14+ |
| ORM | Prisma |
| Backend | Node.js, Express, TypeScript |
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS v4 |
| State | TanStack Query v5 |
| Real-time | Socket.io |
| Auth | JWT (HS256) |
| Encryption | AES-256-GCM |
| Excel | SheetJS (xlsx) |
| Maps | Leaflet |

## 📋 Site Lifecycle

```
FEASIBILITY_PENDING → SURVEY_IN_PROGRESS → FEASIBILITY_APPROVED/REJECTED
→ PROVISIONING → DELIVERED_ACTIVE → RENEWAL_DUE → SUSPENDED → DISCONNECTED
```

## 🎫 Ticket Flow

```
Manual/Telegram/WhatsApp → Ticket Created → Assigned → IN_PROGRESS
→ RESOLVED → CLOSED (or REOPENED)
```
- SLA tracking per priority (HIGH: 4h, MEDIUM: 24h, LOW: 72h)
- Real-time Socket.io alerts to assigned agents
- Internal + customer messages in single thread

## 🔧 Development

```bash
# Backend
npm run dev          # tsx watch
npm run build        # tsc + tsc-alias
npm run seed         # prisma db seed
npm run prisma:studio # DB GUI

# Frontend
npm run dev          # vite
npm run build        # tsc -b && vite build
npm run preview      # preview build
```

## 📄 License

Proprietary - SuperLink IT Services