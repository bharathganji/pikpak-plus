# Use an official Python runtime as a parent image
FROM python:3.11-slim-buster

# Set the working directory to /app
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY *.py .
COPY gunicorn_config.py .
COPY docs/ ./docs/

# Create cache directory for diskcache
RUN mkdir -p .cache/pikpak

# Expose port 5000
EXPOSE 5000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application with Gunicorn (production-ready)
CMD ["gunicorn", "--config", "gunicorn_config.py", "app:app"]

# Alternative: Development mode with Flask
# CMD ["python", "-u", "app.py"]
