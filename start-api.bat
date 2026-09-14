@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" node_modules\json-server-auth\dist\bin.js db.json --host 0.0.0.0 --port 3000 --static .
pause
