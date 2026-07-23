# Multistage Dockerfile for SwarSetu Production Deployment

# Stage 1: Build Frontend SPA from frontend/ directory
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# Stage 2: Python AI Backend Engine & Server
FROM python:3.10-slim AS backend
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application and ML weights
COPY backend/ backend/
COPY unified_predictor.py .

# Copy built frontend assets to backend static/
COPY --from=frontend-builder /app/frontend/dist /app/backend/static

EXPOSE 5000

ENV PORT=5000
ENV PYTHONPATH=/app/backend

CMD ["gunicorn", "--config", "backend/gunicorn.conf.py", "backend.app:app"]
