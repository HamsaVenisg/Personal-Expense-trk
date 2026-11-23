"""SQLAlchemy configuration for the PostgreSQL application database."""
import logging
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import ArgumentError, SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv(Path(__file__).resolve().parents[1] / '.env')
logger = logging.getLogger('uvicorn.error')
SessionLocal = sessionmaker(autoflush=False, expire_on_commit=False)


class DatabaseConfigurationError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    value = os.getenv('DATABASE_URL', '').strip()
    if not value:
        raise DatabaseConfigurationError('DATABASE_URL is missing. Configure the Supabase Session pooler URI in backend/.env.')
    try:
        url = make_url(value)
    except (ArgumentError, ValueError):
        raise DatabaseConfigurationError('DATABASE_URL is malformed. Check the URI and percent-encode its password.') from None
    if url.drivername in ('postgres', 'postgresql'):
        url = url.set(drivername='postgresql+psycopg')
    if url.drivername != 'postgresql+psycopg':
        raise DatabaseConfigurationError('DATABASE_URL must use PostgreSQL with the psycopg driver.')
    if not all((url.host, url.username, url.password, url.database)) or '/' in url.host or '\\' in url.host:
        raise DatabaseConfigurationError('DATABASE_URL must include a TCP host, username, password, and database.')
    if (
        url.host.lower() in ('your_pooler_host', 'host.pooler.supabase.com', 'aws-0-region.pooler.supabase.com')
        or url.username.lower() == 'postgres.project_ref'
        or url.password.lower() in ('password', 'your_password', 'your_url_encoded_password')
    ):
        raise DatabaseConfigurationError('DATABASE_URL still contains Supabase placeholders.')

    # Query values take precedence over URI components in the driver.
    if {'host', 'hostaddr', 'service', 'servicefile', 'dbname', 'user', 'password'} & url.query.keys():
        raise DatabaseConfigurationError('Put PostgreSQL connection details in the URI instead of query overrides.')
    if url.query.get('sslmode') not in ('require', 'verify-ca', 'verify-full'):
        url = url.update_query_dict({'sslmode': 'require'})
    return create_engine(
        url, pool_pre_ping=True, pool_size=5, max_overflow=5,
        pool_timeout=20, pool_recycle=1800, hide_parameters=True,
        connect_args={'connect_timeout': 10, 'gssencmode': 'disable'},
    )

class Base(DeclarativeBase):
    pass


def get_db():
    with SessionLocal(bind=get_engine()) as db:
        try:
            yield db
        except Exception:
            try:
                db.rollback()
            except SQLAlchemyError as error:
                log_database_error('Session rollback', error)
            raise


def log_database_error(operation: str, error: SQLAlchemyError) -> None:
    # Driver messages and SQL parameters can include connection or account data.
    sqlstate = getattr(getattr(error, 'orig', None), 'sqlstate', None)
    logger.error('%s failed (%s, SQLSTATE %s).', operation, type(error).__name__, sqlstate or 'unavailable')


def check_database(engine: Engine) -> None:
    with engine.connect() as connection:
        connection.execute(text('SELECT 1')).scalar_one()


def main() -> int:
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    engine = None
    try:
        engine = get_engine()
        check_database(engine)
    except DatabaseConfigurationError as error:
        logger.error('%s', error)
        return 1
    except SQLAlchemyError as error:
        log_database_error('PostgreSQL connectivity check', error)
        return 1
    finally:
        if engine is not None:
            engine.dispose()
    logger.info('PostgreSQL connectivity check passed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
