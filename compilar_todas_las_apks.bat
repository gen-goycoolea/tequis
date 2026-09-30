@echo off
echo ============================================================
echo 📱 Compilando y Sincronizando las 3 APKs para Android
echo ============================================================
echo.

echo 1. Sincronizando App Cliente (com.tequisquiapan.delivery.cliente)...
cd apps\app_cliente
call npm run build
call npx cap sync android
cd ..\..

echo 2. Sincronizando App Repartidor (com.tequisquiapan.delivery.repartidor)...
cd apps\app_repartidor
call npm run build
call npx cap sync android
cd ..\..

echo 3. Sincronizando App Negocios (com.tequisquiapan.delivery.comercio)...
cd apps\app_comercio
call npm run build
call npx cap sync android
cd ..\..

echo.
echo ✅ Proyectos Android actualizados y sincronizados exitosamente en:
echo   • apps\app_cliente\android
echo   • apps\app_repartidor\android
echo   • apps\app_comercio\android
pause
