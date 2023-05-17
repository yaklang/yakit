@echo off
set PROTO_DIR=common\yakgrpc\protos
set OUT_DIR=common\yakgrpc\ypb

if not exist "%PROTO_DIR%" (
    echo Directory %PROTO_DIR% does not exist.
    exit /b
)

if not exist "%PROTO_DIR%\*.proto" (
    echo No .proto files found in %PROTO_DIR%.
    exit /b
)

echo Running protoc on .proto files in %PROTO_DIR%...

for /R %%f in (%PROTO_DIR%\*.proto) do (
    echo Processing file %%~nxf...
    protoc --go-grpc_out=%OUT_DIR% --go_out=%OUT_DIR% --proto_path=%PROTO_DIR% %%~nxf
)

echo Done.
