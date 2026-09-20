import logging
from typing import Optional, Generator
from contextlib import contextmanager
from app.core.config import settings

logger = logging.getLogger("ciphertrace.neo4j")

try:
    from neo4j import GraphDatabase, Driver, Session as Neo4jSession
    HAS_NEO4J = True
except ImportError:
    HAS_NEO4J = False
    Driver = None
    Neo4jSession = None

_driver_instance: Optional[Driver] = None


def get_neo4j_driver() -> Optional[Driver]:
    """
    Returns a singleton Neo4j Driver instance configured from application settings.
    Returns None gracefully if Neo4j is not reachable or library is uninitialized.
    """
    global _driver_instance
    if not HAS_NEO4J:
        logger.warning("Neo4j python package not installed.")
        return None

    if _driver_instance is None:
        try:
            _driver_instance = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                max_connection_lifetime=30 * 60,
                max_connection_pool_size=50,
                connection_acquisition_timeout=5.0
            )
            logger.info(f"Initialized Neo4j driver connected to {settings.NEO4J_URI}")
        except Exception as e:
            logger.warning(f"Could not connect to Neo4j at {settings.NEO4J_URI}: {str(e)}")
            _driver_instance = None

    return _driver_instance


def check_neo4j_health() -> dict:
    """
    Verifies Neo4j database connectivity and server information.
    """
    driver = get_neo4j_driver()
    if not driver:
        return {
            "status": "UNAVAILABLE",
            "message": "Neo4j driver uninitialized or host unreachable.",
            "uri": settings.NEO4J_URI
        }
    try:
        with driver.session() as session:
            result = session.run("RETURN 1 AS ping")
            record = result.single()
            if record and record["ping"] == 1:
                return {
                    "status": "HEALTHY",
                    "uri": settings.NEO4J_URI,
                    "message": "Graph Database connection verified."
                }
    except Exception as e:
        return {
            "status": "ERROR",
            "uri": settings.NEO4J_URI,
            "error": str(e)
        }

    return {"status": "UNKNOWN", "uri": settings.NEO4J_URI}


def close_neo4j_driver():
    """Closes Neo4j driver on application shutdown."""
    global _driver_instance
    if _driver_instance is not None:
        try:
            _driver_instance.close()
            logger.info("Closed Neo4j driver connection.")
        except Exception as e:
            logger.error(f"Error closing Neo4j driver: {str(e)}")
        finally:
            _driver_instance = None
