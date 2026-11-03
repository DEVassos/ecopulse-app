#!/bin/sh
set -eu

: "${ADMIN_EMAIL:?ADMIN_EMAIL precisa estar definido}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD precisa estar definido}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=admin_email="$ADMIN_EMAIL" \
  --set=admin_password="$ADMIN_PASSWORD" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, password_hash)
VALUES (
  :'admin_email',
  crypt(:'admin_password', gen_salt('bf', 10))
)
ON CONFLICT (lower(email)) DO NOTHING;
SQL
