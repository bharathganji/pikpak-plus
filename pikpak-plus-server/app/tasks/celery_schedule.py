from celery.schedules import crontab
from app.core.config import AppConfig

# Define the schedule for periodic tasks
beat_schedule = {
    'task-status-update': {
        'task': 'app.tasks.jobs.task_status_job.scheduled_task_status_update',
        'schedule': crontab(minute=f'*/{AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES}'),
        'kwargs': {'source': 'scheduled'}
    },
    'cleanup-job': {
        'task': 'app.tasks.jobs.cleanup_job.scheduled_cleanup',
        'schedule': crontab(minute=0, hour=f'*/{AppConfig.CLEANUP_INTERVAL_HOURS}'),
    },
    'webdav-generation': {
        'task': 'app.tasks.jobs.webdav_job.scheduled_webdav_generation',
        'schedule': crontab(minute=0, hour=f'*/{AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS}'),
    },
    'statistics-collection': {
        'task': 'app.tasks.jobs.statistics_job.collect_daily_statistics',
        # Run every hour to ensure daily stats are collected
        'schedule': crontab(minute=0),
    },
    'scheduler-heartbeat': {
        'task': 'app.tasks.jobs.heartbeat_job.scheduler_heartbeat',
        'schedule': crontab(minute='*'),  # Run every minute
    },
}
