# services/orders-python/Dockerfile

# --- Stage 1: Build dependencies ---
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies if needed
# RUN apt-get update && apt-get install -y build-essential

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Stage 2: Create the final image ---
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from the builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy your application code
COPY main.py .

# Expose the port the app runs on
EXPOSE 8085

# The command to run your application using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8085"]