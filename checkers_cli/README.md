# How To

## Install requirements before running anything (Python Version = 3.14.3)

1. `pip install -r requirements.txt` (May be asked to update pip update it by running `python -m pip install --upgrade pip` and install the requirements again)

## Run Tests

1. To run tests make sure your cli is in [checkers_cli](/checkers_cli)
2. Passing Confirmation of test will be in cli. A log of result data will be in [logs](/checkers_cli/logs/) under the filename [test_results.log](/checkers_cli/logs/test_results.log)

## Runing modules seperately

1. Do not run `python ./file_path/file_name.py`
2. Use the package name in [checkers_cli](/checkers_cli) as the root for example python -m checkers_cli.file_path.file_name without the extenssion py
