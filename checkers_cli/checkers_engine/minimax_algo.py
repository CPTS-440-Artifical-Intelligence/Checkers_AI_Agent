import math

from checkers_engine.checkerboard_mapping import MappedCheckerBoard;
from checkers_engine.checkers_board import Board;

#
# Minimax using the mapping of 
#
class CheckersMinimax:
    
    # 0 <= eval <= 1, where eval = 1 means the maximizing player has won, and eval = 0 means the minimizing player has won. (currently eval cant really get to 1 but close) (also when getting closer to win state might randomly choose positions since no value coressponds to closeness to another piece)
    @staticmethod
    def __eval(mapped_board_state: MappedCheckerBoard, is_maximizing_red_player: bool) -> int:
        wgt_max_player_king_count = 1 / (mapped_board_state.PLAYER_CHECKER_COUNT / 0.055);
        wgt_max_player_man_count = 1 / (mapped_board_state.PLAYER_CHECKER_COUNT / 0.025);
        wgt_max_player_man_distance_to_king_difference_count = 1 / (mapped_board_state.STARTING_MAN_DISTANCE_TO_KING / 0.05); # this is more your getting closer to both loss and win state
        wgt_min_player_king_checker_not_on_board_count = 1 / (mapped_board_state.PLAYER_CHECKER_COUNT / 0.075);
        wgt_min_player_dead_checker_count = 1 / (mapped_board_state.PLAYER_CHECKER_COUNT / 0.75);
        if is_maximizing_red_player:
            return ( wgt_max_player_king_count * mapped_board_state.getRedKingCount() 
                + wgt_max_player_man_count * mapped_board_state.getRedManCount() 
                + wgt_max_player_man_distance_to_king_difference_count * (MappedCheckerBoard.STARTING_MAN_DISTANCE_TO_KING - mapped_board_state.getTotalRedMansDistanceToKing())
                + wgt_min_player_king_checker_not_on_board_count * (MappedCheckerBoard.PLAYER_CHECKER_COUNT - mapped_board_state.getBlackKingCount())
                + wgt_min_player_dead_checker_count * (MappedCheckerBoard.PLAYER_CHECKER_COUNT - mapped_board_state.getBlackCheckerCount())
            );
        else:
            return ( wgt_max_player_king_count * mapped_board_state.getBlackKingCount() 
                + wgt_max_player_man_count * mapped_board_state.getBlackManCount() 
                + wgt_max_player_man_distance_to_king_difference_count * (MappedCheckerBoard.STARTING_MAN_DISTANCE_TO_KING - mapped_board_state.getTotalBlackMansDistanceToKing())
                + wgt_min_player_king_checker_not_on_board_count * (mapped_board_state.PLAYER_CHECKER_COUNT - mapped_board_state.getRedKingCount())
                + wgt_min_player_dead_checker_count * (mapped_board_state.PLAYER_CHECKER_COUNT - mapped_board_state.getRedCheckerCount())
            );

    @staticmethod
    def __is_cutoff(mapped_board_state: MappedCheckerBoard, depth_limit: int, current_depth: int) -> bool:
        # print("RED", mapped_board_state.getRedCheckerCount(), "BLACK", mapped_board_state.getBlackCheckerCount(), "DEPTH", current_depth, "LIMIT", depth_limit, "TRUE VALUE", mapped_board_state.getRedCheckerCount() == 0 or mapped_board_state.getBlackCheckerCount() == 0 or depth_limit == current_depth);
        return mapped_board_state.getRedCheckerCount() == 0 or mapped_board_state.getBlackCheckerCount() == 0 or depth_limit == current_depth;

    @staticmethod
    def __max_value(depth_limit: int, current_depth: int, is_maximizing_red_player: bool, mapped_board_state: MappedCheckerBoard, alpha: float, beta: float, node_count: int = 0, greatest_depth_reached: int = 0) -> tuple[float, MappedCheckerBoard, int, int]:
        greatest_depth_reached = max(greatest_depth_reached, current_depth);
        
        # stop the search once a win occurs or depth limit is reached
        if CheckersMinimax.__is_cutoff(mapped_board_state, depth_limit, current_depth):
            return CheckersMinimax.__eval(mapped_board_state, is_maximizing_red_player), None, node_count, greatest_depth_reached;
        
        
        # DFS
        value, move = -math.inf, None;
        for child in MappedCheckerBoard.generateAllPossibleNextMappedBoardStates(mapped_board_state, is_maximizing_red_player):
            node_count += 1;
            
            # get the minimum value of the child node from its children
            value_2, move_2, node_count, greatest_depth_reached = CheckersMinimax.__min_value(depth_limit, current_depth + 1, is_maximizing_red_player, child, alpha, beta, node_count, greatest_depth_reached);
            
            # assigning value and move if value is greater than current trying to maximize here to make max player win
            if value_2 > value:
                value, move = value_2, child;
                alpha = max(alpha, value);
            
            # pruning step, minimize wont choose anything but beta as it is the current lowest and if value is >= that must mean maximize would pass that value up but minimize will never even touch it since beta is better hence anything after value even if its greater for maximize it will be forgon so just prune the sub tree
            if value >= beta:
                return value, move, node_count, greatest_depth_reached;
        
        # return the greatest value and move for the maximizing player and also return alpha for pruning
        return value, move, node_count, greatest_depth_reached;
    
    @staticmethod
    def __min_value(depth_limit: int, current_depth: int, is_maximizing_red_player: bool, mapped_board_state: MappedCheckerBoard, alpha: float, beta: float, node_count: int = 0, greatest_depth_reached: int = 0) -> tuple[float, MappedCheckerBoard, int, int]:
        greatest_depth_reached = max(greatest_depth_reached, current_depth);
        
        # stop the search once a win occurs or depth limit is reached
        if CheckersMinimax.__is_cutoff(mapped_board_state, depth_limit, current_depth):
            return CheckersMinimax.__eval(mapped_board_state, is_maximizing_red_player), None, node_count, greatest_depth_reached;
        
        # DFS
        value, move = math.inf, None;
        for child in MappedCheckerBoard.generateAllPossibleNextMappedBoardStates(mapped_board_state, not is_maximizing_red_player):
            node_count += 1;
            
            # get the maximum value of the child node from its children
            value_2, move_2, node_count, greatest_depth_reached = CheckersMinimax.__max_value(depth_limit, current_depth + 1, is_maximizing_red_player, child, alpha, beta, node_count, greatest_depth_reached);
            
            # assigning value and move if value is less than current trying to minimize here to make max player lose
            if value_2 < value:
                value, move = value_2, child;
                beta = min(beta, value);
            
            # pruning step, maximize wont choose anything but alpha as it is the current greatest and if value is <= that must mean minimize would pass that value up but maximize will never even touch it since alpha is better hence anything after value even if its smaller for minimize it will be forgon so just prune the sub tree
            if value <= alpha: 
                return value, move, node_count, greatest_depth_reached;
        
        # return the smallest value and move for minimizing against max player and also return beta for pruning
        return value, move, node_count, greatest_depth_reached;

    # heurisitc Minimax algorithm with alpha-beta pruning will return the best next move for a given board state
    # returns best next move, greatest depth reached, and nodes visited count
    @staticmethod
    def heuristic_alpha_beta_minimax(depth_limit: int, checker_board_state: Board, is_maximizing_red_player: bool) -> tuple[MappedCheckerBoard, int, int, float]:
        value, move, node_count, greatest_depth_reached = CheckersMinimax.__max_value(depth_limit, 0, is_maximizing_red_player, MappedCheckerBoard.generateMappingFromCheckerBoard(checker_board_state), -math.inf, math.inf);
        return move, greatest_depth_reached, node_count, value;