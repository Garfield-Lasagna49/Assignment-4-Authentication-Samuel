DROP DATABASE IF EXISTS "TodoDB";
CREATE DATABASE "TodoDB";

\c TodoDB;

DROP TYPE IF EXISTS todo_status;
CREATE TYPE todo_status AS ENUM ('incomplete', 'complete');

DROP TABLE IF EXISTS todos;
CREATE TABLE todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status todo_status NOT NULL DEFAULT 'incomplete',
  due_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  edited_at TIMESTAMP
);

DROP TABLE IF EXISTS subtodos;
CREATE TABLE subtodos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  status todo_status NOT NULL DEFAULT 'incomplete',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  edited_at TIMESTAMP,
  todo_id INTEGER REFERENCES todos(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
	profile VARCHAR(255),
	is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP
);
