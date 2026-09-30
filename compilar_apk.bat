@echo off
echo ============================================================
echo 📱 Compilando TequisDelivery para Android (APK)
echo ============================================================
echo.
cd frontend
echo 1. Compilando archivos web optimizados (dist)...
call npm run build
echo.
echo 2. Preparando archivos para APK Android...
echo (Para generar la APK final firmada o APK debug instalable en celular)
echo.
echo Compilación finalizada en carpeta frontend\dist
pause
