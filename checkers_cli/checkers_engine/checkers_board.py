from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple


EMPTY = 0
BLACK_MAN = 1
BLACK_KING = 2
WHITE_MAN = -1
WHITE_KING = -2


@dataclass(frozen=True)
class Move:
    """Represents a move on the playable squares of the board."""

    path: Tuple[int, ...]
    captured: Tuple[int, ...] = ()

    @property
    def is_capture(self) -> bool:
        return len(self.captured) > 0

    @property
    def start(self) -> int:
        return self.path[0]

    @property
    def end(self) -> int:
        return self.path[-1]

    def __str__(self) -> str:
        sep = " x " if self.is_capture else " -> "
        return sep.join(str(square) for square in self.path)


class Board:
    """
    Checkers on a 6x6 board.

    Only the 18 playable dark squares are stored internally.
    turn = 1 means black to move.
    turn = -1 means white to move.
    """

    SIZE = 6
    PLAYABLE_PER_ROW = SIZE // 2
    PLAYABLE_COUNT = SIZE * PLAYABLE_PER_ROW

    def __init__(self, squares: Optional[List[int]] = None, turn: int = BLACK_MAN) -> None:
        if squares is None:
            self.squares = self._initial_squares()
        else:
            if len(squares) != self.PLAYABLE_COUNT:
                raise ValueError(f"Board must contain exactly {self.PLAYABLE_COUNT} playable squares.")
            self.squares = list(squares)

        if turn not in (BLACK_MAN, WHITE_MAN):
            raise ValueError("turn must be BLACK_MAN (1) or WHITE_MAN (-1).")
        self.turn = turn

    @classmethod
    def new_game(cls) -> "Board":
        return cls()

    def copy(self) -> "Board":
        return Board(self.squares.copy(), self.turn)

    def _initial_squares(self) -> List[int]:
        squares = [EMPTY] * self.PLAYABLE_COUNT
        for idx in range(0, 6):
            squares[idx] = BLACK_MAN
        for idx in range(12, 18):
            squares[idx] = WHITE_MAN
        return squares

    @staticmethod
    def is_dark_square_empty(piece: int) -> bool:
        return piece == EMPTY;

    @staticmethod
    def is_black_piece(piece: int) -> bool:
        return piece > 0

    @staticmethod
    def is_white_piece(piece: int) -> bool:
        return piece < 0

    @staticmethod
    def is_king(piece: int) -> bool:
        return abs(piece) == 2

    @staticmethod
    def owner(piece: int) -> int:
        if piece > 0:
            return BLACK_MAN
        if piece < 0:
            return WHITE_MAN
        return 0

    @staticmethod
    def opponent(player: int) -> int:
        return -player

    def piece_at(self, index: int) -> int:
        return self.squares[index]

    def set_piece(self, index: int, piece: int) -> None:
        self.squares[index] = piece

    @classmethod
    def index_to_row_col(cls, index: int) -> Tuple[int, int]:
        row = index // cls.PLAYABLE_PER_ROW
        pos_in_row = index % cls.PLAYABLE_PER_ROW
        if row % 2 == 0:
            col = 1 + 2 * pos_in_row
        else:
            col = 2 * pos_in_row
        return row, col

    @classmethod
    def row_col_to_index(cls, row: int, col: int) -> Optional[int]:
        if not (0 <= row < cls.SIZE and 0 <= col < cls.SIZE):
            return None
        if (row + col) % 2 == 0:
            return None

        if row % 2 == 0:
            pos_in_row = (col - 1) // 2
        else:
            pos_in_row = col // 2
        return row * cls.PLAYABLE_PER_ROW + pos_in_row

    def _simple_directions(self, piece: int) -> List[Tuple[int, int]]:
        if piece == BLACK_MAN:
            return [(1, -1), (1, 1)]
        if piece == WHITE_MAN:
            return [(-1, -1), (-1, 1)]
        if abs(piece) == 2:
            return [(-1, -1), (-1, 1), (1, -1), (1, 1)]
        return []

    def _capture_directions(self, piece: int) -> List[Tuple[int, int]]:
        return self._simple_directions(piece)

    def get_simple_moves_for_piece(self, start: int) -> List[Move]:
        piece = self.piece_at(start)
        if piece == EMPTY or self.owner(piece) != self.turn:
            return []

        moves: List[Move] = []
        row, col = self.index_to_row_col(start)

        for dr, dc in self._simple_directions(piece):
            nr, nc = row + dr, col + dc
            dest = self.row_col_to_index(nr, nc)
            if dest is not None and self.piece_at(dest) == EMPTY:
                moves.append(Move(path=(start, dest)))

        return moves

    def get_capture_moves_for_piece(self, start: int) -> List[Move]:
        piece = self.piece_at(start)
        if piece == EMPTY or self.owner(piece) != self.turn:
            return []
        return self._capture_dfs(start, piece, self.squares, (start,), ())

    def _capture_dfs(
        self,
        current: int,
        piece: int,
        squares: List[int],
        path: Tuple[int, ...],
        captured: Tuple[int, ...],
    ) -> List[Move]:
        row, col = self.index_to_row_col(current)
        found_extensions: List[Move] = []

        for dr, dc in self._capture_directions(piece):
            mid_row, mid_col = row + dr, col + dc
            land_row, land_col = row + 2 * dr, col + 2 * dc
            mid_idx = self.row_col_to_index(mid_row, mid_col)
            land_idx = self.row_col_to_index(land_row, land_col)

            if mid_idx is None or land_idx is None:
                continue

            middle_piece = squares[mid_idx]
            landing_piece = squares[land_idx]

            if middle_piece == EMPTY:
                continue
            if self.owner(middle_piece) != self.opponent(self.owner(piece)):
                continue
            if landing_piece != EMPTY:
                continue
            if mid_idx in captured:
                continue

            next_squares = squares.copy()
            next_squares[current] = EMPTY
            next_squares[mid_idx] = EMPTY

            promoted_piece = self._promote_if_needed(piece, land_idx)
            next_squares[land_idx] = promoted_piece

            next_path = path + (land_idx,)
            next_captured = captured + (mid_idx,)

            extensions = self._capture_dfs(
                land_idx,
                promoted_piece,
                next_squares,
                next_path,
                next_captured,
            )

            if extensions:
                found_extensions.extend(extensions)
            else:
                found_extensions.append(Move(path=next_path, captured=next_captured))

        return found_extensions

    def get_legal_moves(self) -> List[Move]:
        capture_moves: List[Move] = []
        simple_moves: List[Move] = []

        for idx, piece in enumerate(self.squares):
            if piece == EMPTY or self.owner(piece) != self.turn:
                continue

            piece_captures = self.get_capture_moves_for_piece(idx)
            if piece_captures:
                capture_moves.extend(piece_captures)
            else:
                simple_moves.extend(self.get_simple_moves_for_piece(idx))

        return capture_moves if capture_moves else simple_moves

    def apply_move(self, move: Move) -> "Board":
        new_board = self.copy()
        start = move.start
        end = move.end
        piece = new_board.piece_at(start)

        if piece == EMPTY:
            raise ValueError("Cannot move an empty square.")

        new_board.set_piece(start, EMPTY)
        for captured_idx in move.captured:
            new_board.set_piece(captured_idx, EMPTY)

        piece = self._promote_if_needed(piece, end)
        new_board.set_piece(end, piece)
        new_board.turn = self.opponent(self.turn)
        return new_board

    def generate_successor_states(self) -> List[Tuple[Move, "Board"]]:
        return [(move, self.apply_move(move)) for move in self.get_legal_moves()]

    def _promote_if_needed(self, piece: int, dest_index: int) -> int:
        if abs(piece) == 2:
            return piece

        row, _ = self.index_to_row_col(dest_index)
        if piece == BLACK_MAN and row == self.SIZE - 1:
            return BLACK_KING
        if piece == WHITE_MAN and row == 0:
            return WHITE_KING
        return piece

    def count_pieces(self) -> Tuple[int, int]:
        black = 0
        white = 0
        for piece in self.squares:
            if piece > 0:
                black += 1
            elif piece < 0:
                white += 1
        return black, white

    def winner(self) -> Optional[int]:
        black_count, white_count = self.count_pieces()
        if black_count == 0:
            return WHITE_MAN
        if white_count == 0:
            return BLACK_MAN
        if not self.get_legal_moves():
            return self.opponent(self.turn)
        return None

    def is_terminal(self) -> bool:
        return self.winner() is not None

    @staticmethod
    def piece_to_char(piece: int) -> str:
        return {
            EMPTY: ".",
            BLACK_MAN: "b",
            BLACK_KING: "B",
            WHITE_MAN: "w",
            WHITE_KING: "W",
        }[piece]

    def to_grid_string(self, show_indices: bool = False) -> str:
        if show_indices:
            grid = [["  " for _ in range(self.SIZE)] for _ in range(self.SIZE)]
            for idx in range(self.PLAYABLE_COUNT):
                row, col = self.index_to_row_col(idx)
                grid[row][col] = f"{idx:02d}"
            lines = [" ".join(row) for row in grid]
            return "\n".join(lines)

        grid = [[" " for _ in range(self.SIZE)] for _ in range(self.SIZE)]
        for idx, piece in enumerate(self.squares):
            row, col = self.index_to_row_col(idx)
            grid[row][col] = self.piece_to_char(piece)
        lines = [" ".join(row) for row in grid]
        return "\n".join(lines)

    def board_summary(self) -> str:
        black_count, white_count = self.count_pieces()
        turn_name = "BLACK" if self.turn == BLACK_MAN else "WHITE"
        return f"Turn: {turn_name} | Black pieces: {black_count} | White pieces: {white_count}"

    def __str__(self) -> str:
        return f"{self.board_summary()}\n{self.to_grid_string()}"
