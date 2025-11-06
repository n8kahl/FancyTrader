@echo off
echo 🧪 Testing Fancy Trader Build...
echo.

REM Step 1: Clean
echo 📦 Step 1: Cleaning old builds...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist
if exist .vite rmdir /s /q .vite
echo ✅ Clean complete
echo.

REM Step 2: Install
echo 📥 Step 2: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed!
    exit /b 1
)
echo ✅ Install complete
echo.

REM Step 3: Build
echo 🔨 Step 3: Building project...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    exit /b 1
)
echo ✅ Build complete
echo.

REM Step 4: Verify CSS
echo 🎨 Step 4: Verifying CSS output...
if not exist dist\assets\*.css (
    echo ❌ No CSS files found in dist\assets\
    echo This means Tailwind CSS was not built properly!
    exit /b 1
)

dir dist\assets\*.css
echo ✅ Found CSS file(s)
echo.

echo ✅ ALL CHECKS PASSED!
echo.
echo 📋 Build Summary:
echo    • Dependencies: Installed
echo    • Build: Success
echo    • CSS: Generated
echo.
echo 🚀 Ready to deploy!
echo.
echo Next steps:
echo 1. Test locally: npm run preview
echo 2. Deploy: git add . ^&^& git commit -m "Fix build" ^&^& git push
echo.
pause
