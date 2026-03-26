#!/bin/sh
set -e

echo "Waiting for database..."
until python -c "
import os, psycopg2
conn = psycopg2.connect(
    dbname=os.environ.get('DB_NAME','notesdb'),
    user=os.environ.get('DB_USER','notesuser'),
    password=os.environ.get('DB_PASSWORD','notespassword'),
    host=os.environ.get('DB_HOST','db'),
    port=os.environ.get('DB_PORT','5432')
)" 2>/dev/null; do
  echo "PostgreSQL not ready yet – sleeping 2s"
  sleep 2
done
echo "PostgreSQL is ready."

echo "Running migrations..."
python manage.py migrate --no-input

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Starting Gunicorn..."
exec gunicorn core.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
