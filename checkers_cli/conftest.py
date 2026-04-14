import pytest
import logging
import sys
import os;

@pytest.fixture(scope="session", autouse=True)
def setup_logging():
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    
    log_file = f"./logs/test_results.log"
    
    logging.basicConfig(
        level=logging.NOTSET,
        datefmt="[%Y-%m-%d %H:%M:%S]",
        format="%(asctime)s [TEST] [FILE - %(name)s] %(message)s",
        force=True, 
        handlers=[
            logging.FileHandler(log_file, mode='w'),
        ]
    )
    logger = logging.getLogger()
    logger.info("Test Log Starting...")
    yield
    logger.info("Test Log Ending...")