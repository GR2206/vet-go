@echo off
cd /d "%~dp0"
node "%~dp0node_modules\expo\bin\cli" start --tunnel --clear %*
