# Docker Setup Guide

This guide explains how to run PikPak Plus using Docker. The configuration is designed to be secure, with internal communication between the client and server, minimizing exposed ports.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Architecture

- **Client (`web`)**: A Next.js application running on port `3002`.
- **Server (`server`)**: A Python Flask application running on port `5000` (internal only).

### Internal Communication

The client communicates with the server via a **proxy**.

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
SUPABASE_URL=...
SUPABASE_KEY=...
# ... other variables
```

**Note**: You do **not** need to set `VITE_PIKPAK_PLUS_API` or `NEXT_PUBLIC_API_URL` in your `.env` for Docker, as `docker-compose.yml` automatically configures the internal proxy.

## Running the Application

### Start

To build and start the containers:

```bash
docker compose up -d --build
```

- The client will be available at `http://localhost:3002`.
- The server logs can be viewed with `docker compose logs -f server`.

### Stop

To stop the containers:

```bash
docker compose down
```

## Troubleshooting

### "Connection Refused" on API calls

# Docker Setup Guide

This guide explains how to run PikPak Plus using Docker. The configuration is designed to be secure, with internal communication between the client and server, minimizing exposed ports.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Architecture

- **Client (`web`)**: A Next.js application running on port `3002`.
- **Server (`server`)**: A Python Flask application running on port `5000` (internal only).

### Internal Communication

The client communicates with the server via a **proxy**.

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
SUPABASE_URL=...
SUPABASE_KEY=...
# ... other variables
```

**Note**: You do **not** need to set `VITE_PIKPAK_PLUS_API` or `NEXT_PUBLIC_API_URL` in your `.env` for Docker, as `docker-compose.yml` automatically configures the internal proxy.

## Running the Application

### Start

To build and start the containers:

```bash
docker compose up -d --build
```

- The client will be available at `http://localhost:3002`.
- The server logs can be viewed with `docker compose logs -f server`.

### Stop

To stop the containers:

```bash
docker compose down
```

## Troubleshooting

### "Connection Refused" on API calls

- Ensure the `server` container is running (`docker compose ps`).
- Check `server` logs for startup errors (`docker compose logs server`).
- Verify that `API_URL_INTERNAL` is set correctly in the `web` container (it should be `http://server:5000`).

### Changes not reflecting

- If you changed code, you might need to rebuild: `docker compose up -d --build`.
- **Important**: The client-side API URL (`/api`) is baked into the application during the build process. If you need to change this, you must rebuild the container.
- For the client, since it's a production build (`npm run start`), you **must** rebuild the image to see code changes. For development with hot-reload, you would need to mount volumes and use `npm run dev`, but the current setup is optimized for production-like stability.
