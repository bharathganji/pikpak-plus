"""Application Entry Point"""
import logging
import signal
import sys
from app import create_app
from app.core.config import AppConfig

logger = logging.getLogger(__name__)

app = create_app()

if __name__ == '__main__':
    def signal_handler(sig, frame):
        logger.info('Shutting down gracefully...')
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Validate config on startup
    try:
        AppConfig.validate()
    except ValueError as e:
        logger.error(str(e))

    app.run(host='0.0.0.0', port=5000, debug=True)
