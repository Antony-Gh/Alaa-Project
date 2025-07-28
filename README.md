# نظام حجز المواعيد للموظفين - Employee Scheduling System

![scheduling-system-banner](/src/public/main/banner.png)

[![Node.js CI](https://img.shields.io/github/workflow/status/your-org/your-repo/Node.js%20CI?style=flat-square)](https://github.com/your-org/your-repo/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Status: Production Ready](https://img.shields.io/badge/status-production--ready-brightgreen?style=flat-square)](#)

A modern, secure, and scalable web application for managing employee appointments, departments, locations, and resources. Supports Arabic (RTL) and English, with real-time notifications, analytics, recurring appointments, and an admin dashboard.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Screenshots](#-screenshots)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Default Admin Access](#-default-admin-access)
- [API Overview](#-api-overview)
- [Development & Testing](#-development--testing)
- [Security Summary](#-security-summary)
- [Database Schema](#-database-schema)
- [Architecture](#-architecture)
- [Docker Deployment](#-docker-deployment)
- [Environment Variables](#-environment-variables)
- [Deployment Checklist](#-deployment-checklist)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

---

## 🚀 Overview

Built with **Node.js**, **Express.js**, **SQLite**, and a modern Vanilla JS frontend. This project includes:

- Authentication (JWT, role-based access, 2FA-ready)
- Appointment scheduling and conflict management
- Real-time notifications (Socket.IO)
- Admin dashboard and analytics
- File uploads, audit logs, and responsive UI
- Arabic and English support (RTL/LTR)

---

## ✨ Key Features

### 🔐 Security & Authentication

- JWT-based token authentication
- Role-based access control (admin vs employee)
- Password hashing with Bcrypt
- Input validation using Joi (server + client-side)
- XSS, CSRF, and SQL injection protection
- Rate limiting, CORS, Helmet, and session management
- 2FA-ready architecture

### 📅 Appointment Management

- Create, edit, approve, and reject appointments
- Conflict detection (location/time)
- Recurring appointments (daily, weekly, monthly, yearly)
- Status tracking: pending, approved, rejected, missed, done
- Department & location organization
- Admin approval workflow
- Attachments and file uploads

### 📊 Analytics & Dashboard

- Real-time statistics and trends
- Status filters, recent activity, and data export (CSV/JSON)
- Admin dashboard and audit logging
- Health checks and performance metrics
- Department and location performance
- User activity tracking

### 📬 Notifications

- Real-time via Socket.IO (admin/employee)
- Email alerts (status changes, reminders) via Nodemailer
- Notification preferences (email, in-app, push-ready)
- In-app notification center

### 👥 User & Profile Management

- User registration and self-service profile updates
- Admin user management (CRUD)
- Password changes, validation, and secure sessions
- User roles: employee, admin
- Department assignment
- Avatar upload and profile picture

### 🌐 Localization & Accessibility

- Arabic (RTL) and English (LTR) support
- Responsive mobile design
- Dark mode, high contrast, and keyboard accessibility
- Accessible forms and navigation

---

## 🖼️ Screenshots

> _Add your screenshots here!_
>
> ![Dashboard Screenshot](public/main/screenshot-dashboard.png)
> ![Mobile View Screenshot](public/main/screenshot-mobile.png)

---

## 📁 Project Structure

```
Alaa Project/
├── src/
│   ├── app.js
│   ├── config/
│   │   └── config.js              # Application configuration (all environment variables, feature toggles, SMTP, etc.)
│   ├── controllers/
│   │   ├── appointmentController.js
│   │   ├── authController.js
│   │   ├── departmentController.js
│   │   ├── locationController.js
│   │   ├── notificationController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js                # JWT authentication, role checks
│   │   ├── errorHandler.js        # Centralized error handling
│   │   ├── rateLimiter.js         # API rate limiting
│   │   ├── validation.js          # Joi validation middleware
│   │   └── ...
│   ├── routes/
│   │   ├── analyticsRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── authRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── userRoutes.js
│   │   └── adminRoutes.js
│   ├── services/
│   │   ├── emailService.js
│   │   ├── realtimeService.js
│   │   └── ...
│   ├── utils/
│   │   ├── database.js            # Database manager and schema
│   │   ├── logger.js              # Winston logger
│   │   ├── migrate.js             # Migration script
│   │   ├── responseHandler.js     # Standardized API responses
│   │   └── ...
│   └── templates/
│       └── emails/                # HTML email templates
├── public/
│   └── main/
│       ├── index.html
│       ├── style.css
│       ├── script.js
│       └── ...
├── logs/
│   ├── scheduling-system_combined_YYYY-MM-DD_HH-MM-SS.log
│   ├── scheduling-system_error_YYYY-MM-DD_HH-MM-SS.log
├── scheduling.db                  # SQLite database file
├── package.json
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js v14 or higher
- npm or yarn

### Setup

```bash
git clone <repository-url>
cd "Alaa Project"
npm install
cp .env.example .env
# Edit .env as needed (see below for all variables)
npm run migrate       # Run migrations to create/update the database schema
npm run seed          # Seed test/sample data (optional)
npm start             # Start the server
```

Visit: [http://localhost:5000](http://localhost:5000)
API Base: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🔑 Default Admin Access

- **Username:** `admin`
- **Password:** `admin123`

---

## 📡 API Overview

### Auth

- `POST   /api/auth/register` — Register a new user
- `POST   /api/auth/login` — Login and receive JWT
- `POST   /api/auth/logout` — Logout (invalidate token)
- `GET    /api/auth/profile` — Get current user profile
- `PUT    /api/auth/profile` — Update profile
- `PUT    /api/auth/change-password` — Change password

### Appointments

- `GET    /api/appointments` — List all appointments (with filters, pagination, search)
- `POST   /api/appointments` — Create a new appointment
- `GET    /api/appointments/:id` — Get appointment by ID
- `PUT    /api/appointments/:id/status` — Update appointment status (admin only)
- `DELETE /api/appointments/:id` — Delete appointment (admin only)
- `GET    /api/appointments/stats` — Get appointment statistics (counts, trends)

### Departments & Locations

- `GET    /api/appointments/departments` — List all departments
- `POST   /api/admin/departments` — Create department (admin)
- `PUT    /api/admin/departments/:id` — Update department (admin)
- `DELETE /api/admin/departments/:id` — Delete department (admin)
- `GET    /api/appointments/locations` — List all locations
- `POST   /api/admin/locations` — Create location (admin)
- `PUT    /api/admin/locations/:id` — Update location (admin)
- `DELETE /api/admin/locations/:id` — Delete location (admin)

### Users

- `GET    /api/users` — List all users (admin only)
- `GET    /api/users/:id` — Get user by ID (admin only)
- `PUT    /api/users/:id` — Update user (admin only)
- `DELETE /api/users/:id` — Delete user (admin only)
- `GET    /api/users/profile` — Get current user profile
- `PUT    /api/users/profile` — Update current user profile
- `PUT    /api/users/change-password` — Change current user password

### Notifications

- `GET    /api/notifications` — List all notifications for current user
- `PUT    /api/notifications/:id/read` — Mark notification as read
- `PUT    /api/notifications/read-all` — Mark all notifications as read
- `GET    /api/notifications/preferences` — Get notification preferences
- `PUT    /api/notifications/preferences` — Update notification preferences

### Analytics

- `GET    /api/analytics/dashboard` — Get analytics dashboard (stats, trends)
- `GET    /api/analytics/detailed` — Get detailed analytics (by status, department, location, time)
- `GET    /api/analytics/export` — Export analytics data (CSV/JSON)

### Real-time

- `GET    /api/realtime/status` — Get real-time system status (connected users, roles)

---

## 🧪 Development & Testing

```bash
npm run dev         # Start in development mode (with hot reload)
npm test            # Run all tests (unit, integration)
npm run lint        # Lint all code
npm run migrate     # Run DB migration
npm run seed        # Seed test/sample data
npm run backup      # Backup the database
```

---

## 🔐 Security Summary

- JWT authentication for all protected endpoints
- Role-based access control (admin, employee)
- Joi validation for all input (server and client)
- CSRF protection (where applicable)
- XSS protection (server and client)
- SQL injection prevention (parameterized queries)
- Helmet for HTTP security headers
- Rate limiting and brute force protection
- CORS configuration for allowed origins
- Secure logging (Winston, pretty print, error logs)
- Centralized error handling (no stack traces in production responses)
- 2FA-ready (can be enabled in config)

---

## 📊 Database Schema

### users

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'employee',
  department_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  email_verified BOOLEAN DEFAULT 0,
  two_factor_enabled BOOLEAN DEFAULT 0,
  two_factor_secret TEXT,
  last_login DATETIME,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  preferences TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments (id)
);
```

### departments

```sql
CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
  description TEXT,
  manager_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users (id)
);
```

### locations

```sql
CREATE TABLE locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
  description TEXT,
    capacity INTEGER,
  location_type TEXT DEFAULT 'room',
  floor TEXT,
  building TEXT,
  is_active BOOLEAN DEFAULT 1,
  maintenance_schedule TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### appointments

```sql
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    employee_name TEXT NOT NULL,
    employee_id TEXT NOT NULL,
  user_id INTEGER,
    department_id INTEGER,
    location_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    requested_date TEXT,
    requested_time TEXT,
    approved_date TEXT,
    approved_time TEXT,
  duration INTEGER DEFAULT 60,
    status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
    admin_notes TEXT,
    rejection_reason TEXT,
  recurring_pattern TEXT,
  parent_appointment_id TEXT,
  tags TEXT,
  attachments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (department_id) REFERENCES departments (id),
  FOREIGN KEY (location_id) REFERENCES locations (id),
  FOREIGN KEY (parent_appointment_id) REFERENCES appointments (id)
);
```

### recurring_appointments

```sql
CREATE TABLE recurring_appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  interval INTEGER DEFAULT 1,
  days_of_week TEXT,
  day_of_month INTEGER,
  month_of_year INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  max_occurrences INTEGER,
  current_occurrence INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments (id)
);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### analytics

```sql
CREATE TABLE analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_name TEXT NOT NULL,
  metric_value REAL,
  metric_data TEXT,
  date DATE NOT NULL,
  hour INTEGER,
  department_id INTEGER,
  location_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments (id),
    FOREIGN KEY (location_id) REFERENCES locations (id)
);
```

### notifications

```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  is_read BOOLEAN DEFAULT 0,
  read_at DATETIME,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### user_sessions

```sql
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT,
  ip_address TEXT,
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### file_attachments

```sql
CREATE TABLE file_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id TEXT,
  user_id INTEGER,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### calendar_integrations

```sql
CREATE TABLE calendar_integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  calendar_id TEXT,
  is_active BOOLEAN DEFAULT 1,
  last_sync DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### system_settings

```sql
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧱 Architecture

- Modular design: clear separation of routes, controllers, services, middleware, and utilities
- Logging: Winston logger with pretty print, error, and audit logs
- Real-time: Socket.IO for live notifications and updates
- Database: SQLite by default, ready for PostgreSQL/MySQL migration
- Email: Nodemailer with HTML templates for all notifications
- Security: All best practices implemented (see above)
- Localization: Arabic RTL and English LTR fully supported
- Responsive: Mobile-first, dark mode, accessibility

---

## 🐳 Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 📄 Environment Variables

| Variable                         | Description                    | Default                       |
| -------------------------------- | ------------------------------ | ----------------------------- |
| `PORT`                           | Server port                    | 5000                          |
| `JWT_SECRET`                     | Token signing key              | your-secret-key               |
| `DB_PATH`                        | SQLite DB path                 | ./scheduling.db               |
| `NODE_ENV`                       | Environment                    | development                   |
| `CORS_ORIGIN`                    | CORS allowed                   | <http://localhost:3000>         |
| `SESSION_SECRET`                 | Session secret                 | your-session-secret           |
| `EMAIL_ENABLED`                  | Enable email notifications     | false                         |
| `EMAIL_HOST`                     | SMTP host                      | smtp.example.com              |
| `EMAIL_PORT`                     | SMTP port                      | 587                           |
| `EMAIL_USER`                     | SMTP username                  |                               |
| `EMAIL_PASS`                     | SMTP password                  |                               |
| `EMAIL_FROM`                     | From address                   | <noreply@scheduling-system.com> |
| `REALTIME_ENABLED`               | Enable real-time notifications | true                          |
| `RATE_LIMIT_WINDOW_MS`           | Rate limit window (ms)         | 900000                        |
| `RATE_LIMIT_MAX_REQUESTS`        | Max requests per window        | 100                           |
| `LOG_LEVEL`                      | Logging level                  | info                          |
| `LOG_MAX_FILES`                  | Max log files                  | 5                             |
| `LOG_MAX_SIZE`                   | Max log file size              | 5m                            |
| `DEFAULT_TIMEZONE`               | Default timezone               | Egypt/Cairo                   |
| `FEATURE_RECURRING_APPOINTMENTS` | Enable recurring appts         | true                          |
| `FEATURE_DARK_MODE`              | Enable dark mode               | true                          |
| `FEATURE_ACCESSIBILITY`          | Enable accessibility features  | true                          |

---

## 🏁 Deployment Checklist

- Set secure `.env` values for all secrets and production settings
- Use PostgreSQL/MySQL in production for scalability
- Set up HTTPS (SSL/TLS) for secure connections
- Use a process manager (PM2) and reverse proxy (Nginx)
- Enable regular database backups and monitoring
- Configure real-time and email services as needed
- Review all security and performance settings
- Monitor logs and analytics for system health

---

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch
3. Add your feature or fix
4. Write tests if needed
5. Submit a pull request with a clear description

---

## 📬 Support

- [Open an issue](#) for bugs or feature requests
- Review API documentation and codebase for guidance
- For Arabic support, all UI and emails are fully localized

---

## 🏆 License

This project is licensed under the **MIT License**.

---

> **Note:**
>
> - This system is fully localized for Arabic (RTL) and English (LTR).
> - For screenshots, see the `/public/main/` directory or add your own.
> - For production, review all security and deployment recommendations.
