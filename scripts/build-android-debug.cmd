@echo off
setlocal

if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
)

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo ERROR: JAVA_HOME must point to a JDK 11 or newer.
  echo Install Android Studio or set JAVA_HOME before running this script.
  exit /b 1
)

set "PATH=%JAVA_HOME%\bin;%PATH%"

if not defined ANDROID_HOME (
  if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
  )
)

if not exist "android\local.properties" (
  if defined ANDROID_HOME (
    echo sdk.dir=%ANDROID_HOME:\=/%>android\local.properties
  )
)

call npm run build
if errorlevel 1 exit /b 1

call npx cap sync android
if errorlevel 1 exit /b 1

pushd android
call gradlew.bat assembleDebug --console=plain
set "GRADLE_EXIT=%ERRORLEVEL%"
popd

if not "%GRADLE_EXIT%"=="0" exit /b %GRADLE_EXIT%

echo APK generated at android\app\build\outputs\apk\debug\app-debug.apk
