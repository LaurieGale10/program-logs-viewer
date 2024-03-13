import psycopg2
import psycopg2.pool
from contextlib import contextmanager
from configparser import ConfigParser

"""Reads the database parameters from the config file to enable a connection with the program logs database to be established"""
def get_config_parameters():
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

#Ideally want something that will create a unique DB for a given user, then populate it with log data

"""Creates the connection pool to the program logs database, using the parameters returned from the get_config_parameters function"""
@contextmanager
def initialise_connection_pool():
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

config_parameters = get_config_parameters()
dbpool = psycopg2.pool.ThreadedConnectionPool(
    minconn = 1,
    maxconn = 100,
    **config_parameters
)
