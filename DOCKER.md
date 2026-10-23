# Docker Setup Guide

This guide explains how to run PikPak Plus using Docker. The configuration is designed to be secure, with internal communication between the client and server, minimizing exposed ports.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Architecture

- **Client (`web`)**: A Next.js application running on port `3000` (customizable via `APP_PORT`).
- **Server (`server`)**: A Python Flask application running on port `5000` (internal network only).
- **Worker (`worker`)**: Celery worker for background task execution.
- **Beat (`beat`)**: Celery beat for periodic task scheduling.
- **Redis (`redis`)**: In-memory data store for caching and task queueing.

### Internal Communication

The client communicates with the server via a **proxy**:

1. The browser sends API requests to the Next.js client at `/api/...`.
2. The Next.js client (running inside Docker) forwards these requests to the Python server at `http://server:5000/...`.
3. This means the Python server **does not** need to be exposed to the host machine or the internet directly, improving security.

## Configuration

### Environment Variables

Create a `.env` file in the root directory (copy from `example.env`):

```bash
cp example.env .env
```

Edit `.env` with your credentials:

```ini
user=your_email@example.com
passwd=your_password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
# ... other variables
```

### Port Configuration & Dynamic Port Allocation

By default, the web frontend binds to port `3000` on your host. You can dynamically customize or allocate the port using the `APP_PORT` (or `PORT`) environment variable in `.env`:

1. **Custom Port**:
   If port 3000 is occupied on your host, assign any free port:
   ```ini
   APP_PORT=3001
   # or
   APP_PORT=8080
   ```

2. **Dynamic / Automatic Ephemeral Port Allocation (Zero Conflicts)**:
   Set `APP_PORT=0` in `.env` or your container stack settings:
   ```ini
   APP_PORT=0
   ```
   When set to `0`, Docker automatically allocates an available random port on your host, completely avoiding "port is already allocated" errors. You can check the allocated port by running:
   ```bash
   docker compose ps
   ```

3. **Restricting Host Binding IP (Optional)**:
   To restrict access to localhost only:
   ```ini
   HOST_IP=127.0.0.1
   ```

## Running the Application

### Start

To build and start the containers:

```bash
docker compose up -d --build
```

- The client will be available at `http://localhost:<APP_PORT>` (default: `http://localhost:3000`, or the dynamic port assigned if `APP_PORT=0`).
- The server logs can be viewed with `docker compose logs -f server`.

### Stop

To stop the containers:

```bash
docker compose down
```

## Troubleshooting

### Error: "Bind for 0.0.0.0:3000 failed: port is already allocated"

This happens when another application or container on your host machine is already using port 3000.

**Solutions**:
1. **Change the port in `.env`**:
   Set `APP_PORT=3001` (or another unused port) in `.env` and redeploy:
   ```bash
   docker compose up -d
   ```
2. **Let Docker dynamically allocate an available port**:
   Set `APP_PORT=0` in `.env` and run `docker compose up -d`. Then check which port was assigned with `docker compose ps`.
3. **Find and stop the conflicting service**:
   - **Windows (PowerShell)**:
     ```powershell
     Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess, State
     Stop-Process -Id <PID>
     ```
   - **Linux / macOS**:
     ```bash
     lsof -i :3000
     kill -9 <PID>
     ```

### "Connection Refused" on API calls

- Ensure the `server` container is running (`docker compose ps`).
- Check `server` logs for startup errors (`docker compose logs server`).
- Verify that `API_URL_INTERNAL` is set correctly in the `web` container (it should be `http://server:5000`).

### Changes not reflecting

- If you changed code, you might need to rebuild: `docker compose up -d --build`.
- **Important**: The client-side API URL (`/api`) is baked into the application during the build process. If you need to change this, you must rebuild the container.
- For the client, since it's a production build (`npm run start`), you **must** rebuild the image to see code changes. For development with hot-reload, you would need to mount volumes and use `npm run dev`, but the current setup is optimized for production-like stability.
