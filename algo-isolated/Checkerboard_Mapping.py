#
# Checkers Mapped Board State Representation
#
# - Black Starts at Top of Board (MSB or far left of binary), Red Starts at Bottom of Board (LSB or far right of binary)
# - Uses binary encoding of the dark squares ONLY and a choice of using the Red or Black peices
# - Example of a 18 bit board state for one side pieces of the board
#   - checker piece on 7th dark square would be 0b_00_0000_0000_0100_0000
#   - checker pieces on 3rd, 7th, 11th dark square would be 0b_00_0000_0100_0100_0100
# - All mapping will then also be the same for identifying king and mans by looking at those position and flipping a bit to 1 if its a king.
#
# d = length of binary encoding
# p = PLAYER_CHECKER_COUNT
# 
# Note: Can only deal with a 6 x 6 Checker Board however if modified correctly could theoretically do any possible size checker board. (however for this course im not going to worry about that)
#
class MappedCheckerBoard:
    CHECKER_BOARD_SIZE = 6; # Must Modify Algorithm To Change This
    TOTAL_CHECKER_BOARD_SQUARES = CHECKER_BOARD_SIZE * CHECKER_BOARD_SIZE;
    TOTAL_CHECKER_BOARD_DARK_SQUARES = TOTAL_CHECKER_BOARD_SQUARES // 2;
    CHECKER_BOARD_DARK_SQUARES_PER_RANK = CHECKER_BOARD_SIZE // 2;
    TOTAL_CHECKERS_COUNT = CHECKER_BOARD_DARK_SQUARES_PER_RANK * (CHECKER_BOARD_SIZE - 2);
    PLAYER_CHECKER_COUNT = TOTAL_CHECKERS_COUNT // 2
    STARTING_MAN_DISTANCE_TO_KING = sum(
        (size - i) * dark_squares_per_rank
        for size, dark_squares_per_rank, limit in [(CHECKER_BOARD_SIZE, CHECKER_BOARD_DARK_SQUARES_PER_RANK, (PLAYER_CHECKER_COUNT // CHECKER_BOARD_DARK_SQUARES_PER_RANK))]
        for i in range(1, limit + 1)
    )
    
    # Creates the mapped state of the checker board from the board state
    @staticmethod
    def generateMappingFromCheckerBoard(checker_board: any) -> MappedCheckerBoard:
        return null;
    
    # Creates the board state from the mapped state of the checker board
    @staticmethod
    def generateCheckerBoardFromMapping(mapped_checker_board: MappedCheckerBoard) -> any:
        return null;

    # Generate each state from data structure acting as a particular side after converting mapped into original state, then then convert orginal states generated into mapped and use signature to remove similar states and return those somewhat unique states
    @staticmethod
    def generateAllPossibleNextMappedBoardStates(mapped_checker_board: MappedCheckerBoard, is_red_turn: bool) -> list[MappedCheckerBoard]:
        return null;

    def __init__(self, red_checkers: int, black_checkers: int, king_checkers: int):
        self.__red_checkers = red_checkers; # red checkers positions
        self.__black_checkers = black_checkers; # black checkers positions
        self.__king_checkers = king_checkers; # subset of position of red_checkers and black_checkers
        self.__total_red_mans_distance_to_king = self.__GetTotalDistanceToBeKing(self.getRedManCheckers(), True); # O(d)
        self.__total_black_mans_distance_to_king = self.__GetTotalDistanceToBeKing(self.getBlackManCheckers(), False); # O(d)
    
    @staticmethod
    def __GetTotalDistanceToBeKing(man_checkers: int, is_red_side: bool) -> int: # O(d)
        if man_checkers == 0:
            return 0;
        
        acccumulated_distance = 0;

        for i in range(MappedCheckerBoard.TOTAL_CHECKER_BOARD_DARK_SQUARES):
            if (2**i & man_checkers):
                # (i // 3) will only ever be 0 <= (i // 3) <= (CHECKER_BOARD_SIZE-1).
                if (is_red_side):
                    acccumulated_distance += i // 3;
                else:
                    acccumulated_distance += (MappedCheckerBoard.CHECKER_BOARD_SIZE - 1) - (i // 3); 

        return acccumulated_distance;
        
    #
    # Red Checkers Getters
    #
    
    # Gets positions of All red checkers
    def getRedCheckers(self) -> int:
        return self.__red_checkers;
    
    # Gets positions of red king checkers
    def getRedKingCheckers(self) -> int:
        return self.__red_checkers & self.__king_checkers;
    
    # Gets positions of red man checkers
    #
    # Lesser values of this means more mans closer to becoming kings
    def getRedManCheckers(self) -> int:
        return self.__red_checkers ^ self.getRedKingCheckers();
    
    def getRedCheckerCount(self) -> int:
        return self.__red_checkers.bit_count();
    
    def getRedKingCount(self) -> int:
        return self.getRedKingCheckers().bit_count();
    
    def getRedManCount(self) -> int:
        return self.getRedManCheckers().bit_count();
    
    def getTotalRedMansDistanceToKing(self) -> int:
        return self.__total_red_mans_distance_to_king;
    
    #
    # Black Checkers Getters 
    #
    
    # Gets positions of all black checkers
    def getBlackCheckers(self) -> int:
        return self.__black_checkers;
    
    # Gets positions of black king checkers
    def getBlackKingCheckers(self) -> int:
        return self.__black_checkers & self.__king_checkers;
    
    # Gets positions of black man checkers
    #
    ## Note: Greater values of this can mean more mans closer to becoming kings
    def getBlackManCheckers(self) -> int:
        return self.__black_checkers ^ self.getBlackKingCheckers();
    
    def getBlackCheckerCount(self) -> int:
        return self.__black_checkers.bit_count();
    
    def getBlackKingCount(self) -> int:
        return self.getBlackKingCheckers().bit_count();

    def getBlackManCount(self) -> int:
        return self.getBlackManCheckers().bit_count();

    def getTotalBlackMansDistanceToKing(self) -> int:
        return self.__total_black_mans_distance_to_king;

    #
    # Other Functions 
    #

    # Gets the not unique signature of the state for comparison with likewise states (not unique because it is possible to have different board states with the same signature)
    def getStateSignature(self) -> tuple[int, int, int, int, int, int]:
        return (
            self.getRedKingCount(),
            self.getRedManCount(),
            self.getBlackKingCount(),
            self.getBlackManCount(),
            self.getTotalRedMansDistanceToKing(),
            self.getTotalBlackMansDistanceToKing(),
        );

    # true when state is similar to another state
    def __eq__(self, other):
        if isinstance(other, MappedCheckerBoard):
            return self.getStateSignature() == other.getStateSignature();
        return False
    
    # String Representation of Mapped data
    def __repr__(self):
        return f"""
    --Red_Checkers--
    {self.__red_checkers:016b}=Positions
    {self.getRedKingCheckers():016b}=King_Only_Positions
    {self.getRedManCheckers():016b}=Man_Only_Positions
    {self.getRedCheckerCount()}=Checker(s), {self.getRedManCount()}=Man(s), {self.getRedKingCount()}=King(s)
    {self.__total_red_mans_distance_to_king}=Red_Mans_Distance_To_King
    
    --Black_Checkers--
    {self.__black_checkers:016b}=Positions
    {self.getBlackKingCheckers():016b}=King_Only_Positions
    {self.getBlackManCheckers():016b}=Man_Only_Positions
    {self.getBlackCheckerCount()}=Checker(s), {self.getBlackManCount()}=Man(s), {self.getBlackKingCount()}=King(s)
    {self.__total_black_mans_distance_to_king}=Black_Mans_Distance_To_King
    """;

# -- Testing ---
# checkerBoard = MappedCheckerBoard(0b_11_1111_0000_0000_0000, 0b_00_0000_0000_0011_1111, 0b_00_0000_0000_0000_0000);
# print(checkerBoard);