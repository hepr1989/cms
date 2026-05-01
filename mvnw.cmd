@REM Maven Wrapper startup batch script
@REM This script downloads Maven if not found and runs the build

@echo off
setlocal

set MAVEN_PROJECTBASEDIR=%~dp0..
set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_PROPERTIES="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties"

@REM Download wrapper jar if not exists
if not exist %WRAPPER_JAR% (
    echo Downloading Maven Wrapper jar...
    powershell -Command "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar' -OutFile %WRAPPER_JAR%"
)

@REM Execute Maven Wrapper
%JAVA_HOME%\bin\java.exe ^
    -Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR% ^
    -jar %WRAPPER_JAR% %MAVEN_CMD_LINE_ARGS% %*

endlocal
