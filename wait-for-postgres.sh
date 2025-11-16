#!/bin/sh

HOST=$1

until pg_isready -h "$HOST" -p 5432; do
  echo "⏳ Waiting for PostgreSQL at $HOST..."
  sleep 2
done

echo "✅ PostgreSQL is up! Starting server..."

shift
exec "$@"
