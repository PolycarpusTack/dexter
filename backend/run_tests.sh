#!/bin/bash
# Test runner for Dexter backend
# Sets PYTHONPATH to enable module imports

cd "$(dirname "$0")"
export PYTHONPATH="$(pwd):$PYTHONPATH"

# Run pytest with all arguments passed through
python3 -m pytest "$@"
