@echo off
echo Initializing Node.js project...
call npm init -y

echo Installing required packages (express, sqlite3, cors)...
call npm install express sqlite3 cors

echo Build complete! You can now run the server using run.bat.
pause
