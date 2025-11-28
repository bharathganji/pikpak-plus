"""Application Entry Point"""
import logging
from app import create_app
from app.core.config import AppConfig

logger = logging.getLogger(__name__)

app = create_app()

if __name__ == '__main__':
    # Validate config on startup
    try:
        AppConfig.validate()
    except ValueError as e:
        logger.error(str(e))
    
    app.run(host='0.0.0.0', port=5000, debug=True)
