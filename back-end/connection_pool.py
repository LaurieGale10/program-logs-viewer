import os
import psycopg2
import psycopg2.pool
from contextlib import contextmanager
from configparser import ConfigParser

"""Global variable for the thread pool."""
dbpool = None


def _load_config_from_ini():
    # create a parser
    parser = ConfigParser()
    # read config file
    parser.read("database.ini")

    connection_parameters = {}
    if parser.has_section("postgresql"):
        params = parser.items("postgresql")
        for param in params:
            connection_parameters[param[0]] = param[1]
    else:
        raise Exception('Section {0} not found in the {1} file'.format("postgresql", "database.ini"))
    return connection_parameters


def _load_config_from_env():
    return {'dbname': os.getenv("DB_USERNAME"), 'user': os.getenv("DB_USERNAME"),
            'host': os.getenv("DB_HOST"), 'password': os.getenv("DB_PASSWORD")}


"""Reads the database parameters from the config file to enable a connection with the program logs database to be established"""
def get_config_parameters():
    if os.getenv("DB_USERNAME") and os.getenv("DB_HOST"):
        return _load_config_from_env()
    else:
        return _load_config_from_ini()


"""Creates the connection pool to the program logs database, using the parameters returned from the get_config_parameters function"""
@contextmanager
def get_conn_from_pool():
    _init()
    conn = dbpool.getconn()
    try:
        with conn.cursor() as cur:
            yield cur
            conn.commit()
    except:
        conn.rollback()
        raise
    finally:
        dbpool.putconn(conn)


"""Lazy-initialise the thread pool if not already initialised."""
def _init():
    global dbpool
    if dbpool is not None:
        return
    config_parameters = get_config_parameters()
    dbpool = psycopg2.pool.ThreadedConnectionPool(
        minconn = 1,
        maxconn = 100,
        **config_parameters
    )
