#!/usr/bin/env bash
# 仅社区版 Yakit 使用。macOS / Linux / Windows（含 legacy）都先下轻量产物，没有再退回全量。
# 本地下载文件名保持 yak_*，保证 zip 内路径仍是 bins/yak_*，解压逻辑不用改。
# 每个产物旁写 engine-build-type.*，打包时按实际文件标记 slim 或 full。
set -euo pipefail

PLATFORM="${1:-all}"
VERSION="${2:-${ENGINE_VERSION:-}}"
OSS_BASE="${OSS_BASE:-https://yaklang.oss-accelerate.aliyuncs.com}"

if [ -z "$VERSION" ]; then
  echo "ENGINE_VERSION required" >&2
  exit 1
fi

mkdir -p bins
BASE="${OSS_BASE}/yak/${VERSION}"

write_marker() {
  printf '%s\n' "$2" > "bins/$1"
}

# 先试轻量 URL，失败再用全量 URL，并把结果写入 marker。
download_prefer_slim() {
  local dest="$1"
  local slim_url="$2"
  local full_url="$3"
  local marker="$4"
  if wget -O "$dest" "$slim_url"; then
    write_marker "$marker" slim
    return 0
  fi
  echo "slim artifact missing, fallback: $full_url" >&2
  wget -O "$dest" "$full_url"
  write_marker "$marker" full
}

zip_and_remove() {
  local bin="$1"
  local archive="$2"
  rm -f "$archive"
  zip -q "$archive" "$bin"
  rm -f "$bin"
}

download_linux_arch() {
  local arch="$1"
  local bin="bins/yak_linux_${arch}"
  download_prefer_slim \
    "$bin" \
    "${BASE}/yak-slim_linux_${arch}" \
    "${BASE}/yak_linux_${arch}" \
    "engine-build-type.linux.${arch}"
  zip_and_remove "$bin" "bins/yak_linux_${arch}.zip"
}

download_linux() {
  download_linux_arch amd64
  download_linux_arch arm64
}

download_windows_one() {
  local slim_name="$1"
  local full_name="$2"
  local archive="$3"
  local marker="$4"
  local bin="bins/yak_windows_amd64.exe"
  download_prefer_slim \
    "$bin" \
    "${BASE}/${slim_name}" \
    "${BASE}/${full_name}" \
    "$marker"
  zip_and_remove "$bin" "$archive"
}

download_windows() {
  download_windows_one \
    yak-slim_windows_amd64.exe \
    yak_windows_amd64.exe \
    bins/yak_windows_normal_amd64.zip \
    engine-build-type.windows
  # OSS 目前没有 yak-slim_windows_legacy_*，会退回 yak_windows_legacy_amd64.exe
  download_windows_one \
    yak-slim_windows_legacy_amd64.exe \
    yak_windows_legacy_amd64.exe \
    bins/yak_windows_legacy_amd64.zip \
    engine-build-type.windows-legacy
}

download_darwin_arch() {
  local arch="$1"
  local bin="bins/yak_darwin_${arch}"
  local marker="engine-build-type.darwin.${arch}"
  download_prefer_slim \
    "$bin" \
    "${BASE}/yak-slim_darwin_${arch}" \
    "${BASE}/yak_darwin_${arch}" \
    "$marker"
  local kind
  kind="$(tr -d '[:space:]' < "bins/${marker}")"
  local prefix="yak_"
  if [ "$kind" = "slim" ]; then
    prefix="yak-slim_"
  fi
  wget -O "${bin}.sha256.txt" "${BASE}/${prefix}darwin_${arch}.sha256.txt"
}

download_darwin() {
  download_darwin_arch amd64
  download_darwin_arch arm64
}

case "$PLATFORM" in
  all)
    download_linux
    download_windows
    download_darwin
    ;;
  linux) download_linux ;;
  windows) download_windows ;;
  darwin) download_darwin ;;
  *)
    echo "Unknown platform: $PLATFORM (all|linux|windows|darwin)" >&2
    exit 1
    ;;
esac

echo "Community Yakit engine ready ${VERSION} (${PLATFORM})"
