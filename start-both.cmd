@echo off
cd /d "%~dp0"
echo PETS^&GO: app en :8081  ^|  panel dueños en :5173
echo Fuera de casa: chat y pedidos van por Firebase (EXPO_PUBLIC_FIREBASE_* en .env)
start "PETSGO-app" cmd /k node "%~dp0node_modules\expo\bin\cli" start
start "PETSGO-owner" cmd /k node "%~dp0owner-web\node_modules\vite\bin\vite.js" --config "%~dp0owner-web\vite.config.ts"
