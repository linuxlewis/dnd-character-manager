CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "user" (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	email text NOT NULL UNIQUE,
	email_verified boolean NOT NULL DEFAULT false,
	image text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_anonymous boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "session" (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	expires_at timestamptz NOT NULL,
	token text NOT NULL UNIQUE,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	ip_address text,
	user_agent text,
	user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session" (user_id);

CREATE TABLE IF NOT EXISTS account (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	account_id text NOT NULL,
	provider_id text NOT NULL,
	user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
	access_token text,
	refresh_token text,
	id_token text,
	access_token_expires_at timestamptz,
	refresh_token_expires_at timestamptz,
	scope text,
	password text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_user_id_idx ON account (user_id);

CREATE TABLE IF NOT EXISTS verification (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	identifier text NOT NULL,
	value text NOT NULL,
	expires_at timestamptz NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);
