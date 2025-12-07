import os
from celery import Celery
from app.core.config import AppConfig


def make_celery(app_name=__name__):
    """
    Create and configure a Celery instance.
    """
    redis_url = AppConfig.REDIS_URL

    celery = Celery(
        app_name,
        backend=redis_url,
        broker=redis_url,
        include=[
            'app.tasks.jobs.task_status_job',
            'app.tasks.jobs.cleanup_job',
            'app.tasks.jobs.webdav_job',
            'app.tasks.jobs.statistics_job',
            'app.tasks.jobs.heartbeat_job'
        ]
    )

    from app.tasks.celery_schedule import beat_schedule

    celery.conf.update(
        result_expires=3600,  # Results expire after 1 hour to save Redis memory
        timezone='UTC',
        enable_utc=True,
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        broker_connection_retry_on_startup=True,
        beat_schedule=beat_schedule,
    )

    return celery


celery_app = make_celery("pikpak_worker")
