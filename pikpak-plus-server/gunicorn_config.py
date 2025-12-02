"""
Gunicorn configuration file for PikPak Plus Server
"""
import multiprocessing

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = 2
threads = 4
worker_class = "gthread"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Optimize access logging - reduce verbosity


def when_ready(server):
    """Log server startup only from primary worker"""
    server.log.info("Gunicorn server starting...")


def worker_int(worker):
    """Reduce worker initialization logging noise"""
    worker.log.info(
        f"Worker received SIGINT or SIGQUIT. Shutting down worker {worker.pid}")


def pre_fork(server, worker):
    """Reduce pre-fork logging"""
    pass  # Suppress routine fork logs


def post_fork(server, worker):
    """Log worker startup only from primary worker (worker 0)"""
    if worker.pid == 0:
        server.log.info("Primary worker spawned")


def pre_exec(server):
    """Reduce pre-exec logging"""
    pass


def worker_abort(worker):
    """Log worker abort"""
    worker.log.info(
        f"Worker received SIGABRT signal. Aborting worker {worker.pid}")


def worker_init(worker):
    """Set worker ID environment variable for log filtering"""
    import os
    os.environ['WORKER_ID'] = str(worker.idx)
    if worker.idx > 0:
        # Reduce log verbosity for non-primary workers during initialization
        logging.getLogger('app').setLevel(logging.WARNING)


# Process naming
proc_name = "pikpak-plus-server"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = None
# certfile = None
