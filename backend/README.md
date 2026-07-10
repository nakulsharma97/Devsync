# DevSync Backend

Spring Boot 3.4 + Java 21 REST API backend for the DevSync developer collaboration platform.

## Prerequisites

- Java 21+
- Maven 3.9+
- MySQL 8.0+

## Quick Start

### 1. Create Database

```sql
CREATE DATABASE devsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure

Edit `src/main/resources/application.yml` or set environment variables:

```bash
export JWT_SECRET=your-256-bit-secret-key-here
export MAIL_USERNAME=your-email@gmail.com
export MAIL_PASSWORD=your-app-password
```

### 3. Run

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The API starts at: **http://localhost:8080**

## API Endpoints

### Auth (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email + password |
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/otp/send?email=` | Send OTP for email login |
| POST | `/api/auth/otp/verify` | Verify OTP and login |
| POST | `/api/auth/oauth/callback` | OAuth2 callback handler |
| GET | `/api/auth/me` | Get current user (requires auth) |

### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get my profile |
| PUT | `/api/users/me` | Update my profile |
| GET | `/api/users/{id}` | Get user by ID |
| GET | `/api/users?q=` | Search users |

### Projects (`/api/projects`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | Get my projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get project details |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |
| POST | `/api/projects/{id}/members` | Add member |
| DELETE | `/api/projects/{id}/members/{userId}` | Remove member |

### Team Rooms (`/api/rooms`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | Get my rooms |
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms/{id}` | Get room details |
| POST | `/api/rooms/{id}/invite` | Invite user to room |
| GET | `/api/rooms/{id}/participants` | Get room participants |

### Messages (`/api/messages`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/conversations` | Get all conversations |
| GET | `/api/messages/room/{roomId}` | Get room messages |
| GET | `/api/messages/dm/{userId}` | Get DM conversation |
| POST | `/api/messages` | Send a message |

### WebSocket (`/ws`)

Use SockJS + STOMP:

```
Connect: http://localhost:8080/ws
Subscribe: /topic/room/{roomId}
Subscribe: /user/queue/messages
Subscribe: /user/queue/notifications
Send: /app/chat.send
Send: /app/chat.typing
```

### Notifications (`/api/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/{id}/read` | Mark as read |
| PUT | `/api/notifications/read-all` | Mark all as read |

### Kanban Boards (`/api/boards`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/{id}` | Get board with columns & tasks |
| GET | `/api/boards/project/{projectId}` | Get project board |
| POST | `/api/boards?name=&projectId=&columns=` | Create board |
| POST | `/api/boards/tasks` | Create task |
| PUT | `/api/boards/tasks/position` | Update task position (drag-drop) |
| PUT | `/api/boards/tasks/{id}` | Update task |
| DELETE | `/api/boards/tasks/{id}` | Delete task |

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Get your token from `POST /api/auth/login` or `POST /api/auth/register`.
