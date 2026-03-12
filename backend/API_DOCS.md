# 🌙 Daydream App — API Documentation

**Base URL:** `http://localhost:5000/api`  
**Auth:** Bearer Token (JWT) — include `Authorization: Bearer <token>` header on all private routes.

---

## 📁 Project Structure

```
daydream-backend/
├── config/
│   └── db.js                  # MongoDB connection
├── controllers/
│   ├── authController.js      # Auth logic
│   ├── profileController.js   # Profile logic
│   ├── homeController.js      # Quotes + Tasks logic
│   ├── timerController.js     # Session/Timer logic
│   ├── journalController.js   # Journal logic
│   └── comfortController.js   # Comfort logic
├── middleware/
│   ├── auth.js                # JWT protect middleware
│   ├── errorHandler.js        # Validation + global error handler
│   └── upload.js              # Multer avatar upload
├── models/
│   ├── User.js
│   ├── Quote.js
│   ├── Task.js                # DefaultTask, DefaultTaskStatus, UserTask
│   ├── Session.js
│   ├── Journal.js
│   └── Comfort.js             # DefaultComfort, UserComfort
├── routes/
│   ├── auth.js
│   ├── profile.js
│   ├── home.js
│   ├── timer.js
│   ├── journal.js
│   └── comfort.js
├── seeds/
│   └── seed.js                # Seed default data
├── utils/
│   ├── generateToken.js       # JWT helpers
│   ├── sendEmail.js           # Nodemailer email
│   ├── encryption.js          # AES encrypt/decrypt journals
│   └── response.js            # Standardized API responses
├── uploads/
│   └── avatars/               # Avatar images (gitignored)
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

---

## ⚙️ Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Seed the database (quotes, default tasks, default comforts)
npm run seed

# 4. Start development server
npm run dev

# 5. Start production server
npm start
```

---

## 🔒 AUTH ROUTES — `/api/auth`

### POST `/api/auth/signup`
Register a new user.

**Body:**
```json
{
  "name": "Ahmed Khan",
  "email": "ahmed@example.com",
  "password": "mypassword123"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Account created successfully!",
  "data": {
    "token": "eyJhbGci...",
    "user": { "_id": "...", "name": "Ahmed Khan", "email": "ahmed@example.com" }
  }
}
```

---

### POST `/api/auth/login`
Login with email and password.

**Body:**
```json
{
  "email": "ahmed@example.com",
  "password": "mypassword123"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Logged in successfully!",
  "data": {
    "token": "eyJhbGci...",
    "user": { "_id": "...", "name": "Ahmed Khan", "email": "...", "avatar": "", "dob": null, "goal": "", "why": "" }
  }
}
```

---

### POST `/api/auth/forgot-password`
Send a password reset link to the user's email.

**Body:**
```json
{ "email": "ahmed@example.com" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "If that email is registered, a reset link has been sent."
}
```

---

### POST `/api/auth/reset-password/:token`
Reset password using the token from the email link.

**URL Param:** `token` — the reset token from the email  
**Body:**
```json
{ "password": "newpassword123" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Password reset successfully. Please log in."
}
```

---

### GET `/api/auth/me` 🔐
Get currently authenticated user.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Ahmed", "email": "...", "dob": null, "address": "", "goal": "", "why": "", "avatar": "" }
  }
}
```

---

## 👤 PROFILE ROUTES — `/api/profile` 🔐 (All Private)

### GET `/api/profile`
Get user's full profile.

---

### PUT `/api/profile`
Update profile fields.

**Body (all optional):**
```json
{
  "name": "Ahmed Khan",
  "dob": "1995-06-15",
  "address": "123 Main Street, Karachi",
  "goal": "Overcome daydreaming and be fully present",
  "why": "I want to be more productive and build real relationships"
}
```

---

### PUT `/api/profile/avatar`
Upload avatar image. Send as `multipart/form-data`.

**Form field:** `avatar` (file — jpg/png/gif/webp, max 2MB)

**Response:**
```json
{
  "success": true,
  "data": { "avatar": "uploads/avatars/avatar_userId_timestamp.jpg" }
}
```

> Serve avatar at: `http://localhost:5000/uploads/avatars/filename.jpg`

---

### DELETE `/api/profile/avatar`
Remove current avatar.

---

### PUT `/api/profile/change-password`
Change password while logged in.

**Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## 🏠 HOME ROUTES — `/api/home` 🔐 (All Private)

### GET `/api/home/quote`
Get a random quote from the database.

**Response:**
```json
{
  "success": true,
  "data": {
    "quote": { "_id": "...", "text": "Where focus goes, energy flows.", "author": "Tony Robbins", "category": "focus" }
  }
}
```

---

### GET `/api/home/quotes`
Get all quotes.

---

### GET `/api/home/default-tasks`
Get all default tasks with the user's current status for each.

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      { "_id": "...", "title": "Morning Grounding Exercise", "icon": "🌅", "status": "pending" },
      { "_id": "...", "title": "5-Minute Mindfulness", "icon": "🧘", "status": "completed" }
    ]
  }
}
```

---

### PUT `/api/home/default-tasks/:taskId/status`
Mark a default task as completed or pending.

**Body:**
```json
{ "status": "completed" }
```

Values: `"pending"` | `"completed"`

---

### GET `/api/home/tasks`
Get all of the user's custom tasks.

**Query Params (optional):**
- `?status=pending` — filter by status

---

### POST `/api/home/tasks`
Create a new custom task.

**Body:**
```json
{
  "title": "Read 10 pages",
  "description": "Read self-help book daily",
  "dueDate": "2025-12-31"
}
```

---

### PUT `/api/home/tasks/:id`
Edit a custom task.

**Body (any fields):**
```json
{ "title": "Updated title", "description": "Updated desc" }
```

---

### PUT `/api/home/tasks/:id/status`
Update status of a custom task.

**Body:**
```json
{ "status": "completed" }
```

---

### DELETE `/api/home/tasks/:id`
Delete a custom task.

---

## ⏱️ TIMER ROUTES — `/api/timer` 🔐 (All Private)

### POST `/api/timer/sessions`
Log a new daydreaming session.

**Body:**
```json
{
  "duration": 1800,
  "emotion": "bored",
  "emotionNote": "I was bored during the meeting",
  "sessionDate": "2025-06-15",
  "startTime": "14:30",
  "endTime": "15:00",
  "notes": "Triggered by a long zoom call"
}
```

**Emotion values:** `happy` | `sad` | `anxious` | `bored` | `stressed` | `calm` | `excited` | `neutral` | `other`

---

### GET `/api/timer/sessions`
Get all sessions (paginated, filterable by date).

**Query Params (optional):**
- `?startDate=2025-06-01&endDate=2025-06-30`
- `?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": [ { "duration": 1800, "emotion": "bored", "sessionDate": "2025-06-15T..." } ],
  "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

### GET `/api/timer/sessions/report`
Get aggregated report — daily totals, emotion breakdown, overall stats.

**Query Params (optional):**
- `?startDate=2025-06-01&endDate=2025-06-30`

**Response:**
```json
{
  "success": true,
  "data": {
    "dailySummary": [
      { "_id": "2025-06-15", "totalDuration": 3600, "sessionCount": 2, "avgDuration": 1800 }
    ],
    "emotionBreakdown": [
      { "_id": "bored", "count": 8, "totalDuration": 14400 }
    ],
    "totals": { "totalSessions": 15, "totalDuration": 27000, "avgDuration": 1800 }
  }
}
```

---

### GET `/api/timer/sessions/:id`
Get a single session.

---

### PUT `/api/timer/sessions/:id`
Update a session.

---

### DELETE `/api/timer/sessions/:id`
Delete a session.

---

## 📓 JOURNAL ROUTES — `/api/journal` 🔐 (All Private)

> All entries are **AES-encrypted** in the database. They are decrypted before sending to the frontend.

### POST `/api/journal`
Create a new journal entry.

**Body:**
```json
{
  "entry": "Today I caught myself daydreaming during work. I noticed the trigger was stress about my presentation...",
  "entryDate": "2025-06-15",
  "entryTime": "21:30",
  "mood": "neutral"
}
```

**Mood values:** `great` | `good` | `neutral` | `bad` | `terrible`

---

### GET `/api/journal`
Get all journal entries (decrypted, paginated).

**Query Params:**
- `?startDate=2025-06-01&endDate=2025-06-30`
- `?page=1&limit=10`

---

### GET `/api/journal/:id`
Get a single journal entry (decrypted).

---

### PUT `/api/journal/:id`
Update a journal entry.

---

### DELETE `/api/journal/:id`
Delete a journal entry.

---

## 🌿 COMFORT ROUTES — `/api/comfort` 🔐 (All Private)

### GET `/api/comfort`
Get **all** comforts — both default (system-wide) and user's own.

**Response:**
```json
{
  "success": true,
  "data": {
    "defaultComforts": [
      { "_id": "...", "title": "4-7-8 Breathing", "description": "...", "icon": "💨", "category": "breathing" }
    ],
    "userComforts": [
      { "_id": "...", "title": "My custom comfort", "description": "...", "icon": "💙" }
    ]
  }
}
```

---

### GET `/api/comfort/default`
Get only default comforts.

---

### GET `/api/comfort/my`
Get only user's custom comforts.

---

### POST `/api/comfort`
Add a new custom comfort.

**Body:**
```json
{
  "title": "Listen to Rain Sounds",
  "description": "Put on brown noise or rain sounds for 5 minutes to reset my focus.",
  "icon": "🌧️"
}
```

---

### PUT `/api/comfort/:id`
Update a custom comfort.

---

### DELETE `/api/comfort/:id`
Delete a custom comfort (only user's own, not defaults).

---

## 🔄 Standard Response Format

**Success:**
```json
{
  "success": true,
  "message": "...",
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ] // validation errors (optional)
}
```

**Paginated:**
```json
{
  "success": true,
  "data": [ ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

## 🛡️ Security Features

| Feature | Implementation |
|---|---|
| Password Hashing | bcryptjs (12 salt rounds) |
| JWT Auth | 7-day expiry, Bearer token |
| Journal Encryption | AES-256 via crypto-js |
| Password Reset | SHA-256 hashed token, 15-min expiry |
| Rate Limiting | 100 req/15min global; 10/15min for auth |
| Helmet | Security headers |
| Input Validation | express-validator on all endpoints |
| File Upload | Multer, image-only, 2MB max |

---

## 🌱 Seeded Data

Run `npm run seed` to populate:
- **15 quotes** (motivation, focus, mindfulness, productivity)
- **8 default tasks** (daily habits to overcome daydreaming)
- **10 default comforts** (breathing, grounding, movement, mindfulness exercises)


## testing : https://jagriti-7997.postman.co/workspace/Managing-Md~70ba12e5-e195-4c8d-bd1f-2333ddd16563/request/43618917-03d8b89f-2d0b-4e23-9abe-80096042fbae?action=share&creator=43618917  