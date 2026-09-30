@echo off
echo ============================================================
echo 🚴‍♂️ Iniciando TequisDelivery (Servidor + App Web/Móvil)
echo ============================================================
echo.
echo 1. Iniciando Servidor Backend en puerto 4000...
start cmd /k "cd backend && npm start"
echo 2. Iniciando App Frontend en puerto 3000...
start cmd /k "cd frontend && npm run dev"
echo.
echo App lista. Abre tu navegador en: http://localhost:3000
pause
