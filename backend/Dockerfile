FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Install Python deps (skip the -e . line)
COPY requirements.txt .
RUN grep -v "^-e \." requirements.txt > requirements_clean.txt && pip install --no-cache-dir -r requirements_clean.txt

# Copy app
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY pyproject.toml .

# Install the package itself (non-editable)
RUN pip install --no-cache-dir --no-deps .

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
