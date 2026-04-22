"""
Background Scheduler Service
Manages scheduled tasks for session management using APScheduler
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
import logging
from datetime import timezone

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = AsyncIOScheduler()

# Job stores (persist jobs across restarts)
jobstores = {
    'default': SQLAlchemyJobStore(url='sqlite:///quickserve.db')
}

# Executors
executors = {
    'default': AsyncIOExecutor()
}

# Job defaults
job_defaults = {
    'coalesce': True,  # Combine missed jobs into one
    'max_instances': 1,  # Only run one instance at a time
    'misfire_grace_time': 60  # Allow 60 seconds for missed jobs
}


async def check_idle_sessions(db_factory):
    """
    Background task: Mark sessions as idle if no heartbeat for 2 minutes.

    Runs every 1 minute.

    Args:
        db_factory: Database session factory (callable) - not used, kept for compatibility
    """
    from app.core.database import AsyncSessionLocal
    from app.utils.timezone_config import get_utc_now
    from app.models.table_session import SessionStatus, TableSession
    from app.models.session_participant import ConnectionStatus, SessionParticipant
    from sqlalchemy import select, and_, update
    import datetime

    async with AsyncSessionLocal() as db:
        # Find all sessions that should transition to IDLE
        # A session is IDLE if all participants have no heartbeat for 2 minutes
        cutoff_time = get_utc_now() - datetime.timedelta(minutes=2)

        # Get sessions with ACTIVE status
        from app.models.table_session import TableSession
        result = await db.execute(
            select(TableSession).where(TableSession.status == SessionStatus.ACTIVE)
        )
        active_sessions = result.scalars().all()

        idle_count = 0

        for session in active_sessions:
            # Check all participants for this session
            participant_result = await db.execute(
                select(SessionParticipant).where(
                    and_(
                        SessionParticipant.table_session_id == session.id,
                        SessionParticipant.is_active == True
                    )
                )
            )
            participants = participant_result.scalars().all()

            if not participants:
                continue

            # Check if all participants are idle
            all_idle = True
            for participant in participants:
                # Update connection status based on heartbeat
                # Handle naive datetime from SQLite (timezone info stripped)
                heartbeat = participant.last_heartbeat_at
                if heartbeat and heartbeat.tzinfo is None:
                    heartbeat = heartbeat.replace(tzinfo=timezone.utc)
                if heartbeat and heartbeat > cutoff_time:
                    all_idle = False
                    participant.connection_status = ConnectionStatus.CONNECTED
                else:
                    participant.connection_status = ConnectionStatus.IDLE

            if all_idle:
                # All participants idle, mark session as IDLE
                session.status = SessionStatus.IDLE
                idle_count += 1
                logger.info(f"Session {session.id} marked as IDLE (no heartbeat for 2min)")

        if idle_count > 0:
            await db.commit()

        logger.debug(f"check_idle_sessions completed. {idle_count} sessions marked idle.")


async def process_grace_periods(db_factory):
    """
    Background task: Transition sessions from PAUSING to PAUSED.

    Runs every 30 seconds.

    Args:
        db_factory: Database session factory (callable) - not used, kept for compatibility
    """
    from app.core.database import AsyncSessionLocal
    from app.services.session_pause_service import SessionPauseService

    async with AsyncSessionLocal() as db:
        pause_service = SessionPauseService(db)
        transitioned = await pause_service.process_expired_grace_periods()

        if transitioned > 0:
            logger.info(f"process_grace_periods: {transitioned} sessions transitioned to PAUSED")


async def cleanup_expired_sessions(db_factory):
    """
    Background task: Hard-end sessions paused for more than 24 hours.

    Runs every 1 hour.

    Args:
        db_factory: Database session factory (callable) - not used, kept for compatibility
    """
    from app.core.database import AsyncSessionLocal
    from app.services.session_pause_service import SessionPauseService

    async with AsyncSessionLocal() as db:
        pause_service = SessionPauseService(db)
        ended = await pause_service.cleanup_expired_sessions()

        if ended > 0:
            logger.info(f"cleanup_expired_sessions: {ended} sessions ended after 24h expiry")


async def cleanup_preserved_carts(db_factory):
    """
    Background task: Remove preserved carts older than 24 hours.

    Runs every 6 hours.

    Args:
        db_factory: Database session factory (callable) - not used, kept for compatibility
    """
    from app.core.database import AsyncSessionLocal
    from app.services.session_pause_service import SessionPauseService

    async with AsyncSessionLocal() as db:
        pause_service = SessionPauseService(db)
        cleaned = await pause_service.cleanup_preserved_carts()

        if cleaned > 0:
            logger.info(f"cleanup_preserved_carts: {cleaned} carts cleaned up")


async def init_scheduler(db_factory):
    """
    Initialize background tasks on startup.

    Args:
        db_factory: Database session factory (callable)
    """
    # Check if smart session end is enabled (env var)
    import os
    enabled = os.getenv('ENABLE_SMART_SESSION_END', 'true').lower() == 'true'

    if not enabled:
        logger.info("Smart session end disabled - scheduler not initialized")
        return

    logger.info("Initializing background scheduler...")

    # Configure scheduler
    scheduler.configure(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone='UTC'
    )

    # Clear existing jobs (in case of restart)
    scheduler.remove_all_jobs()

    # ============================================================
    # Job 1: Check for idle sessions
    # Runs every 1 minute
    # ============================================================
    scheduler.add_job(
        check_idle_sessions,
        trigger=IntervalTrigger(minutes=1),
        id='check_idle_sessions',
        name='Check idle sessions',
        kwargs={'db_factory': db_factory},
        replace_existing=True
    )
    logger.info("  Scheduled: check_idle_sessions (every 1 minute)")

    # ============================================================
    # Job 2: Process grace periods (PAUSING → PAUSED)
    # Runs every 30 seconds
    # ============================================================
    scheduler.add_job(
        process_grace_periods,
        trigger=IntervalTrigger(seconds=30),
        id='process_grace_periods',
        name='Process grace periods',
        kwargs={'db_factory': db_factory},
        replace_existing=True
    )
    logger.info("  Scheduled: process_grace_periods (every 30 seconds)")

    # ============================================================
    # Job 3: Cleanup expired sessions (24h PAUSED → ENDED)
    # Runs every 1 hour
    # ============================================================
    scheduler.add_job(
        cleanup_expired_sessions,
        trigger=IntervalTrigger(hours=1),
        id='cleanup_expired_sessions',
        name='Cleanup expired sessions',
        kwargs={'db_factory': db_factory},
        replace_existing=True
    )
    logger.info("  Scheduled: cleanup_expired_sessions (every 1 hour)")

    # ============================================================
    # Job 4: Cleanup preserved carts
    # Runs every 6 hours
    # ============================================================
    scheduler.add_job(
        cleanup_preserved_carts,
        trigger=IntervalTrigger(hours=6),
        id='cleanup_preserved_carts',
        name='Cleanup preserved carts',
        kwargs={'db_factory': db_factory},
        replace_existing=True
    )
    logger.info("  Scheduled: cleanup_preserved_carts (every 6 hours)")

    # Start scheduler
    scheduler.start()
    logger.info("Background scheduler started successfully")


def shutdown_scheduler():
    """Shutdown scheduler gracefully"""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler shut down")


def get_scheduler():
    """Get the global scheduler instance"""
    return scheduler
