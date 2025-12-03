from celery.schedules import crontab
import app.tasks.celery_tasks
from app import create_app
from app.celery_utils import make_celery

flask_app = create_app()
celery = make_celery(flask_app)

# Import tasks to ensure they are registered

# Configure Beat Schedule
celery.conf.beat_schedule = {
    'cleanup-tasks': {
        'task': 'cleanup_tasks',
        'schedule': float(flask_app.config['CLEANUP_INTERVAL_HOURS']) * 3600,
    },
    'update-task-status': {
        'task': 'update_task_status',
        'schedule': float(flask_app.config['TASK_STATUS_UPDATE_INTERVAL_MINUTES']) * 60,
    },
    'generate-webdav-links': {
        'task': 'generate_webdav_links',
        'schedule': float(flask_app.config['WEBDAV_GENERATION_INTERVAL_HOURS']) * 3600,
    },
    'collect-stats': {
        'task': 'collect_stats',
        'schedule': 86400.0,  # 24 hours
    },
}
