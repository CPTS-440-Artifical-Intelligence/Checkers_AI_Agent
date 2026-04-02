from checkers_engine.minimax_algo import CheckersMinimax;
from checkers_engine.checkerboard_mapping import MappedCheckerBoard;
from checkers_engine.checkers_board import Board;
from abc import abstractmethod
import pytest
import time
import logging
logger = logging.getLogger(__name__)

# NOTE: The reason why tests are slow is because of the mapping and calculations for each node for similarity score
# if we were to only use the bitmap of the board the speed was increase by a ton, if we were to make a better similarity score pruning it would also not prune decent move states
class BaseMinimaxAlgo:
    
    @pytest.fixture(scope="class", autouse=True)
    def class_setup_teardown(self):
        logger.info("--- Start %s ---", self.__class__.__name__);
        yield;
        logger.info("--- End   %s ---", self.__class__.__name__);
    
    @pytest.fixture(scope="function", autouse=True)
    def unit_setup_teardown(self, request):
        self.message_data : dict = { "greatest_depth_reached": 0, "node_count": 0, "final_eval_score": 0,  };
        
        clock_start = time.perf_counter();
        cpu_start = time.process_time();
        yield;
        cpu_time = time.process_time() - cpu_start;
        clock_time = time.perf_counter() - clock_start;
        
        logger.info("""[Unit %s] Clock Time: %.4f seconds, CPU Time: %.4f seconds, Greatest Depth Reached: %d, Node Count: %d, Final Eval Score: %.6f""", 
                    request.node.name, 
                    clock_time, cpu_time, 
                    self.message_data["greatest_depth_reached"],
                    self.message_data["node_count"], 
                    self.message_data["final_eval_score"]
        );
    
    @abstractmethod
    def get_depth_limit(self) -> int:
        pass;
    
    def is_black_turn(self) -> bool:
        pass;
    
    def testInitalBoardState(self):
        move, greatest_depth_reached, node_count, value = CheckersMinimax.heuristic_alpha_beta_minimax(self.get_depth_limit(), Board(), not self.is_black_turn());
        assert True, "This test should always pass"
        self.message_data : dict = { "greatest_depth_reached": greatest_depth_reached, "node_count": node_count, "final_eval_score": value,  };
        
    def testMidGameBoardState(self):
        move, greatest_depth_reached, node_count, value = CheckersMinimax.heuristic_alpha_beta_minimax(self.get_depth_limit(), MappedCheckerBoard.generateCheckerBoardFromMapping(MappedCheckerBoard(0b_010_100_010_000_000_000, 0b_000_000_000_001_001_010, 0b_000_000_000_000_000_000), self.is_black_turn()), not self.is_black_turn());
        assert True, "This test should always pass"
        self.message_data : dict = { "greatest_depth_reached": greatest_depth_reached, "node_count": node_count, "final_eval_score": value,  };    
    
    def testEndGameBoardState(self):
        move, greatest_depth_reached, node_count, value = CheckersMinimax.heuristic_alpha_beta_minimax(self.get_depth_limit(), MappedCheckerBoard.generateCheckerBoardFromMapping(MappedCheckerBoard(0b_100_000_000_000_000_001, 0b_000_000_010_000_000_000, 0b_100_000_000_000_000_000), self.is_black_turn()), not self.is_black_turn());
        assert True, "This test should always pass"
        self.message_data : dict = { "greatest_depth_reached": greatest_depth_reached, "node_count": node_count, "final_eval_score": value,  };    

# Black Turn Tests

class TestBlackDepth5MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 5;
    def is_black_turn(self) -> bool:
        return True;

class TestBlackDepth10MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 10;
    def is_black_turn(self) -> bool:
        return True;
    
class TestBlackDepth15MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 15;
    def is_black_turn(self) -> bool:
        return True;
    
class TestBlackDepth20MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 20;
    def is_black_turn(self) -> bool:
        return True;
    
class TestBlackDepth25MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 25;
    def is_black_turn(self) -> bool:
        return True;
    
# Red (White) Turn Tests
    
class TestRedDepth5MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 5;
    def is_black_turn(self) -> bool:
        return False;

class TestRedDepth10MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 10;
    def is_black_turn(self) -> bool:
        return False;
    
class TestRedDepth15MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 15;
    def is_black_turn(self) -> bool:
        return False;
    
class TestRedDepth20MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 20;
    def is_black_turn(self) -> bool:
        return False;
    
class TestRedDepth25MinimaxAlgo(BaseMinimaxAlgo):
    def get_depth_limit(self) -> int:
        return 25;
    def is_black_turn(self) -> bool:
        return False;
    

    