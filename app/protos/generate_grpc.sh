#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

command -v protoc >/dev/null 2>&1 || { echo -e "${RED}protoc is not installed. Please download and install it. Aborting.${NC}"; echo -e "${GREEN}https://github.com/protocolbuffers/protobuf/releases${NC}"; exit 1; }
echo "Found protoc version $(protoc --version)"

command -v protoc-gen-go >/dev/null 2>&1 || { echo -e "${RED}protoc-gen-go is not installed. Please download and install it. Aborting.${NC}"; echo -e "${GREEN}go install google.golang.org/protobuf/cmd/protoc-gen-go@latest${NC}"; exit 1; }
echo "Found protoc-gen-go version $(protoc-gen-go --version)"

command -v protoc-gen-go-grpc >/dev/null 2>&1 || { echo -e "${RED}protoc-gen-go-grpc is not installed. Please download and install it. Aborting.${NC}"; echo -e "${GREEN}go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest${NC}"; exit 1; }
echo "Found protoc-gen-go-grpc version $(protoc-gen-go-grpc --version)"

PROTO_DIR="common/yakgrpc/protos"
OUT_DIR="common/yakgrpc/ypb"

if [ ! -d "$PROTO_DIR" ]; then
    echo -e "${RED}Directory $PROTO_DIR does not exist.${NC}"
    exit
fi

if [ $(ls -1 "$PROTO_DIR"/*.proto 2>/dev/null | wc -l) -eq 0 ]; then
    echo -e "${RED}No .proto files found in $PROTO_DIR.${NC}"
    exit
fi

echo "Running protoc on .proto files in $PROTO_DIR..."

for file in $PROTO_DIR/*.proto
do
    echo "Processing file ${file}..."
    protoc --go-grpc_out=$OUT_DIR --go_out=$OUT_DIR --proto_path=$PROTO_DIR ${file}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error processing file ${file}${NC}"
        exit
    fi
done

echo "Done."
