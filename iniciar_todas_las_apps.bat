@echo off
echo ============================================================
echo 📱 Iniciando las 3 Apps Independientes de TequisDelivery
echo ============================================================
echo.
echo 1. Servidor Backend Central (Puerto 4000)...
start cmd /k "cd backend && npm start"

echo 2. App Cliente (Puerto 3001)...
start cmd /k "cd apps\app_cliente && npm run dev"

echo 3. App Repartidor Bici (Puerto 3002)...
start cmd /k "cd apps\app_repartidor && npm run dev"

echo 4. App Negocios / Fondas (Puerto 3003)...
start cmd /k "cd apps\app_comercio && npm run dev"

echo.
echo ✅ Todas las apps iniciadas independientemente:
echo   • App Cliente: http://localhost:3001
echo   • App Repartidor: http://localhost:3002
echo   • App Negocios: http://localhost:3003
echo   • Backend API: http://localhost:4000
pause
