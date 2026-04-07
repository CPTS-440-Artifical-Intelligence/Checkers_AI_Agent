from checkers_engine.checkers_board import BLACK_MAN, Board, Move, WHITE_MAN
from checkers_engine.checkerboard_mapping import MappedCheckerBoard
from checkers_engine.minimax_algo import CheckersMinimax


def print_header() -> None:
    print("Solid Checkers CLI Tester")
    print("American checkers, 6x6 board, playable-square indexing")
    print()


def print_index_map() -> None:
    board = Board.new_game()
    print("Playable square index map:")
    print(board.to_grid_string(show_indices=True))
    print()


def print_help() -> None:
    print("Commands:")
    print("  moves             Show legal moves for the current player")
    print("  play N            Play move number N from the current move list")
    print("  board             Reprint the current board")
    print("  map               Show playable-square index map")
    print("  reset             Reset to a fresh game")
    print("  help              Show commands")
    print("  quit              Exit")
    print()


def print_board(board: Board) -> None:
    print(board.board_summary())
    print(board.to_grid_string())
    print()


def player_name(turn: int) -> str:
    return "BLACK" if turn == BLACK_MAN else "WHITE"


def print_moves(board: Board, moves: list[Move]) -> None:
    if not moves:
        print("No legal moves available.")
        return

    print(f"Legal moves for {player_name(board.turn)}:")
    for idx, move in enumerate(moves):
        move_type = "capture" if move.is_capture else "simple"
        print(f"  {idx}: {move} [{move_type}]")
    print()


def main() -> None:
    board = Board.new_game()
    print_header()
    print_index_map()
    print_help()
    print_board(board)

    ai_side = WHITE_MAN
    is_maximizing_red_player = (ai_side == WHITE_MAN)

    while True:
        winner = board.winner()
        if winner is not None:
            print(f"Game over. Winner: {player_name(winner)}")
            break

        if board.turn == ai_side:
            print("AI is thinking...")
            mapped_result, depth_reached, nodes_visited, score = CheckersMinimax.heuristic_alpha_beta_minimax(5, board, is_maximizing_red_player)
            board = MappedCheckerBoard.generateCheckerBoardFromMapping(mapped_result, board.turn == WHITE_MAN)
            print(f"AI moved. (depth={depth_reached}, nodes={nodes_visited}, score={score:.4f})\n")
            print_board(board)
            continue

        moves = board.get_legal_moves()
        command = input(f"{player_name(board.turn)} to move > ").strip()

        if command == "":
            continue

        if command.lower() in {"quit", "exit", "q"}:
            print("Exiting.")
            break

        if command.lower() == "help":
            print_help()
            continue

        if command.lower() == "board":
            print_board(board)
            continue

        if command.lower() == "map":
            print_index_map()
            continue

        if command.lower() == "reset":
            board = Board.new_game()
            print("Board reset.\n")
            print_board(board)
            continue

        if command.lower() == "moves":
            print_moves(board, moves)
            continue

        if command.lower().startswith("play "):
            parts = command.split()
            if len(parts) != 2 or not parts[1].isdigit():
                print("Use: play N\n")
                continue

            move_index = int(parts[1])
            if move_index < 0 or move_index >= len(moves):
                print("Invalid move number. Type 'moves' to see available options.\n")
                continue

            selected_move = moves[move_index]
            board = board.apply_move(selected_move)
            print(f"Played move: {selected_move}\n")
            print_board(board)
            continue

        print("Unknown command. Type 'help' to see available commands.\n")


if __name__ == "__main__":
    main()
