@echo off
REM Run the Dexter API with the new architecture

if "%1"=="" (
    echo Running with default mode
    python -m app.main_new
) else (
    echo Running with %1 mode
    set APP_MODE=%1
    python -m app.main_new
)
