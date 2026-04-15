# Logistics Management System

A full-stack MERN (MongoDB, Express, React, Node.js) web application for logistics and vehicle fleet management with real-time tracking, order management, and advertisement listings.

## Features

- **User Authentication & RBAC** – JWT-based auth with four roles: Admin, Owner, Driver, Customer
- **Vehicle & Driver Management** – CRUD operations, driver-vehicle assignment
- **Order & Trip Management** – Full order lifecycle (Requested → Paid → Approved → Assigned → In Progress → Completed)
- **Real-Time Vehicle Tracking** – GPS location updates via Socket.io
- **Advertisement Module** – Car listings with advanced search, filtering, and sorting
- **Reviews & Ratings** – Customer reviews for drivers, services, and listings
- **Notifications** – Real-time notifications via Socket.io
- **Reports & Analytics** – Dashboard stats, exportable reports (PDF, CSV, Excel)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router v7, Axios, Socket.io Client |
| Backend | Node.js, Express 5, Mongoose, Socket.io |
| Database | MongoDB |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Email | Nodemailer |
| Reports | PDFKit, ExcelJS, json2csv |

## Project Structure

```
logistics/
├── server/                 # Backend API
│   ├── config/             # Database configuration
│   ├── controllers/        # Route handlers
│   ├── middleware/          # Auth, error handling, validation
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routes
│   ├── utils/              # Email, socket manager
│   ├── __tests__/          # Jest tests
│   └── server.js           # Entry point
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components (auth, dashboard, vehicles, etc.)
│   │   ├── context/        # Auth and Socket contexts
│   │   ├── services/       # API service layer
│   │   └── App.jsx         # Root component with routing
│   └── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)

### Backend Setup

```bash
cd server
cp .env.example .env    # Edit with your MongoDB URI, JWT secret, etc.
npm install
npm start               # Starts on http://localhost:5000
```

### Frontend Setup

```bash
cd client
npm install
npm run dev             # Starts on http://localhost:3000
```

### Running Tests

```bash
cd server
npm test
```

## API Endpoints

| Prefix | Description |
|--------|-------------|
| `/api/v1/auth` | Authentication (register, login, password reset) |
| `/api/v1/users` | User management (admin only) |
| `/api/v1/vehicles` | Vehicle CRUD and driver assignment |
| `/api/v1/drivers` | Driver profile management |
| `/api/v1/orders` | Order lifecycle and tracking |
| `/api/v1/advertisements` | Car listing CRUD with search/filter |
| `/api/v1/reviews` | Reviews and ratings |
| `/api/v1/notifications` | User notifications |
| `/api/v1/tracking` | Real-time vehicle tracking |
| `/api/v1/reports` | Analytics and report exports |

## Environment Variables

See `server/.env.example` for the full list of required environment variables.
