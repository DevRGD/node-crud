# Todo App API (Node.js Backend)

This is a secure and scalable backend API for a full-stack Todo management application, built with Node.js, Express, and MongoDB.

It provides a comprehensive set of endpoints for user authentication, task management, and fine-grained permission control.

## Core Features

* **JWT Authentication:** Secure auth flow using `accessToken` and `refreshToken` stored in `HttpOnly` cookies.
* **Dynamic Permission System:** A flexible, database-driven authorization model that checks permissions on a per-user, per-route basis.
* **Full Task/Permission Management:** Complete CRUD endpoints for both `todos` and `permissions`.
* **File Uploads:** Supports attaching files to todos using `multer`.
* **Scope-Based Data:** Controllers can deliver data based on a user's scope (`own` vs. `all`), allowing admins to see all todos while users see only their own.

---

## Technology

* **Node.js & Express:** Core framework for the REST API.
* **MongoDB & Mongoose:** Database and Object Data Modeling (ODM) library.
* **JSON Web Token (JWT):** For generating secure access and refresh tokens.
* **Bcrypt:** For hashing user passwords.
* **Multer:** Middleware for handling `multipart/form-data` (file uploads).
* **path-to-regexp:** For matching dynamic request paths against stored permission paths.
* **Dotenv:** For managing environment variables.

---

## Key Architecture: Dynamic Authorization

This API uses a sophisticated, user-centric permission system.

1.  **`User.js` Model:** Stores basic user info (name, email, password).
2.  **`Permission.js` Model:** This is the core of the system. **Each user has one** `Permission` document linked to their `user._id`. This document contains:
    * Their `role` (e.g., "superadmin", "admin", "user").
    * A `permissions` array, which lists every route they can *potentially* access.
    * Each permission in the array has an `isEnabled` toggle and a `scope` (`'own'` or `'all'`).
3.  **`auth.js` Controller:** When a new user registers, this controller creates a `User` document *and* a corresponding `Permission` document for them, using the defaults from `configs/env.js` (like `DEFAULT_PERMISSIONS`).
4.  **`protect.js` Middleware:** This is the "brain" of the API. On every protected request, it:
    * Verifies the `accessToken` and fetches the `User`.
    * Fetches the user's *specific* `Permission` document.
    * **Bypasses all checks** if `Permissions.role === 'superadmin'`.
    * Finds the *exact* permission from the user's `permissions` array that matches the incoming `req.method` and `req.path`.
    * Blocks the request if the permission is not found or `isEnabled: false`.
    * If allowed, it attaches the `scope` (e.g., `req.user.scope = 'all'`) to the request for the controller to use.
5.  **`todo.js` Controllers:** The controllers use the `req.user.scope` to build their database queries. For example, the `list` controller will show all todos if `req.user.scope === 'all'`, but will filter by `user: req.user._id` if `req.user.scope === 'own'`.

## API Endpoints

All routes under `/todo` and `/permissions` are protected.

### Auth
* `POST /auth/register`: Create a new user and their default permission document.
* `POST /auth/login`: Log in (receives `accessToken` and `refreshToken` cookies).
* `POST /auth/logout`: Log out and clear auth cookies.
* `POST /auth/refresh`: Get a new `accessToken` using a valid `refreshToken`.

### Todos (Protected)
* `GET /todo/list`: Get a list of todos (data returned depends on scope).
* `POST /todo`: Create a new todo.
* `GET /todo/:id`: Get a single todo (data returned depends on scope).
* `PATCH /todo/:id`: Update a todo.
* `DELETE /todo/:id`: Delete a todo.

### Permissions (Protected: superadmin by default)
* `GET /permissions/list`: Get a list of all users and their permission documents.
* `PATCH /permissions/user/:id`: Update the *entire* permission document for a single user.
* `PATCH /permissions/role/:roleName`: Bulk update a *single* permission (e.g., enable "DELETE") for all users matching a role.

## Getting Started

1.  Clone the repository.
2.  Run `npm install` (or `yarn install`).
3.  Add `"type": "module"` to your `package.json` file.
4.  Create a `.env` file. Use `configs/env.js` as a guide for all required variables (e.g., `DB_URL`, `ACCESS_TOKEN_SECRET`, `DEFAULT_PERMISSIONS`).
5.  Run `npm run dev` to start the server.
