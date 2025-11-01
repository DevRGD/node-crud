# Todo App API (Node.js)

This is a secure and scalable backend API for a Todo management application, built with Node.js, Express, and MongoDB.

It provides a full set of endpoints for user authentication and task management, secured by a flexible, hybrid authorization system.

## Core Features

* **JWT Authentication:** Secure auth flow using `accessToken` and `refreshToken` stored in `HttpOnly` cookies.
* **Hybrid Authorization:** A powerful permission system that merges role-based templates with per-user overrides.
* **Full Task Management:** Complete CRUD (Create, Read, Update, Delete) functionality for todos.
* **File Uploads:** Supports attaching files to todos using `multer`.

## Technology

* **Node.js & Express:** The core framework for building the REST API.
* **MongoDB & Mongoose:** Used as the NoSQL database and Object Data Modeling (ODM) library.
* **JSON Web Token (JWT):** Used for creating secure access and refresh tokens.
* **Bcrypt:** For hashing user passwords.
* **Multer:** Middleware for handling `multipart/form-data`, primarily for file uploads.
* **Dotenv:** For managing environment variables.

## Advanced Authorization System

This API does not use a simple role string. It uses a hybrid system that provides role-level defaults and user-level exceptions.

1.  **Role Model (`models/Role.js`):** Acts as a **permission template**. A role (e.g., "user") has a list of permissions, each with a default `isEnabled` state and a `scope` (e.g., 'own' or 'all').
2.  **User Model (`models/User.js`):** Each user is assigned a `role` (the template) and also has a `permissionOverrides` array. This array can override the role's defaults for that specific user (e.g., to disable a permission).
3.  **`protect` Middleware (`middleware/auth.js`):** This is the core logic. On every authenticated request, it:
    * Authenticates the user's JWT.
    * Fetches the user's `role` template and their personal `permissionOverrides`.
    * **Computes** the final set of permissions by merging the two lists.
    * Checks if the user has a *final, enabled* permission for the requested route.
    * Checks the permission's `scope` and enforces ownership (e.g., a user with 'own' scope can't edit another user's todo).

## API Endpoints

All `/todo` routes are protected and require a valid `accessToken`.

### Auth

* `POST /auth/register`: Create a new user account.
* `POST /auth/login`: Log in and receive `accessToken` and `refreshToken` cookies.
* `POST /auth/logout`: Log out and clear auth cookies.
* `POST /auth/refresh`: Receive a new `accessToken` using a valid `refreshToken`.

### Todos

* `GET /todo/list`: Get a list of todos. Admins see all; users see their own.
* `POST /todo`: Create a new todo (with optional file upload).
* `GET /todo/:id`: Get details for a single todo.
* `PATCH /todo/:id`: Update a todo (with optional file upload).
* `DELETE /todo/:id`: Delete a todo.

## Getting Started

1.  Clone the repository.
2.  Run `npm install` (or `yarn install`).
3.  Create a `.env` file in the root. Use `configs/env.js` as a guide for the required variables (e.g., `DB_URL`, `ACCESS_TOKEN_SECRET`).
4.  In your MongoDB database, you **must** create the `Role` documents (e.g., "user", "admin") with their default permissions, as the `register` controller relies on them.
5.  Run `npm run dev` to start the server with nodemon.
