try {
    $protoc = Get-Command protoc
    Write-Host "Found protoc version $($protoc.Version)"
} catch {
    Write-Host "protoc is not installed. Please download and install it." -ForegroundColor Red
    Write-Host "https://github.com/protocolbuffers/protobuf/releases" -ForegroundColor Green
    exit
}

try {
    $protocGenGo = Get-Command protoc-gen-go
    Write-Host "Found protoc-gen-go version $($protocGenGo.Version)"
} catch {
    Write-Host "protoc-gen-go is not installed. Please download and install it." -ForegroundColor Red
    Write-Host "go install google.golang.org/protobuf/cmd/protoc-gen-go@latest" -ForegroundColor Green
    exit
}

try {
    $protocGenGoGrpc = Get-Command protoc-gen-go-grpc
    Write-Host "Found protoc-gen-go-grpc version $($protocGenGoGrpc.Version)"
} catch {
    Write-Host "protoc-gen-go-grpc is not installed. Please download and install it." -ForegroundColor Red
    Write-Host "go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest" -ForegroundColor Green
    exit
}

$PROTO_DIR = "common\yakgrpc\protos"
$OUT_DIR = "common\yakgrpc\ypb"

if (-not (Test-Path $PROTO_DIR)) {
    Write-Host "Directory $PROTO_DIR does not exist." -ForegroundColor Red
    exit
}

if (-not (Test-Path "$PROTO_DIR\*.proto")) {
    Write-Host "No .proto files found in $PROTO_DIR." -ForegroundColor Red
    exit
}

Write-Host "Running protoc on .proto files in $PROTO_DIR..."

Get-ChildItem -Path $PROTO_DIR -Filter *.proto -Recurse | ForEach-Object {
    Write-Host "Processing file $($_.Name)..."
    $result = & protoc --go-grpc_out=$OUT_DIR --go_out=$OUT_DIR --proto_path=$PROTO_DIR $_.Name 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error processing file $($_.Name):" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit
    }
}

Write-Host "Done."
