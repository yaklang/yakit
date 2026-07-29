#!/bin/sh


# Exec Paths
SIPS='/usr/bin/sips'
ICONUTIL='/usr/bin/iconutil'
if [ ! -x "${SIPS}" ]; then
	echo "Cannot find required SIPS executable at: ${SIPS}" >&2
	exit 1;
fi
if [ ! -x "${ICONUTIL}" ]; then
	echo "Cannot find required ICONUTIL executable at: ${ICONUTIL}" >&2
	exit 1;
fi

# Parameters
SOURCE=$1

# Get source image
if [ -z "${SOURCE}" ]; then
	echo "No source image specified, searching in current directory...\c"
	SOURCE=$( ls *.png | head -n1 )
	if [ -z "${SOURCE}" ]; then
		echo "No source image specified and none found."
		exit 1;
	else
		echo "FOUND";
	fi
fi


# File Infrastructure
NAME=$(basename "${SOURCE}")
EXT="${NAME##*.}"
BASE="${NAME%.*}"
ICONSET="${BASE}.iconset"

# Debug Info
echo "SOURCE: ${SOURCE}"
echo "NAME: $NAME"
echo "BASE: $BASE"
echo "EXT: $EXT"
echo "ICONSET: $ICONSET"

# Get source image info
SRCWIDTH=$( $SIPS -g pixelWidth "${SOURCE}" | tail -n1 | awk '{print $2}')
SRCHEIGHT=$( $SIPS -g pixelHeight "${SOURCE}" | tail -n1 | awk '{print $2}' )
SRCFORMAT=$( $SIPS -g format "${SOURCE}" | tail -n1 | awk '{print $2}' )

# Debug Info
echo "SRCWIDTH: $SRCWIDTH"
echo "SRCHEIGHT: $SRCHEIGHT"
echo "SRCFORMAT: $SRCFORMAT"

# # Check The Source Image
# if [ "x${SRCWIDTH}" != "x1024" ] || [ "x${SRCHEIGHT}" != "x1024" ]; then
# 	echo "ERR: Source image should be 1024 x 1024 pixels." >&2
# 	exit 1;
# fi
if [ "x${SRCFORMAT}" != "xpng" ]; then
	echo "ERR: Source image format should be png." >&2
	exit 1;
fi

# Resample image into iconset
mkdir "${ICONSET}"
$SIPS -s format png --resampleWidth 1080 "${SOURCE}" --out "${ICONSET}/icon_512x512@2x.png" > /dev/null 2>&1
$SIPS -s format png --resampleWidth 512 "${SOURCE}" --out "${ICONSET}/icon_512x512.png" > /dev/null 2>&1
cp  "${ICONSET}/icon_512x512.png"  "${ICONSET}/icon_256x256@2x.png"
$SIPS -s format png --resampleWidth 256 "${SOURCE}" --out "${ICONSET}/icon_256x256.png" > /dev/null 2>&1
cp  "${ICONSET}/icon_256x256.png"  "${ICONSET}/icon_128x128@2x.png"
$SIPS -s format png --resampleWidth 128 "${SOURCE}" --out "${ICONSET}/icon_128x128.png" > /dev/null 2>&1
$SIPS -s format png --resampleWidth 64 "${SOURCE}" --out "${ICONSET}/icon_32x32@2x.png" > /dev/null 2>&1
$SIPS -s format png --resampleWidth 32 "${SOURCE}" --out "${ICONSET}/icon_32x32.png" > /dev/null 2>&1
cp  "${ICONSET}/icon_32x32.png"  "${ICONSET}/icon_16x16@2x.png"
$SIPS -s format png --resampleWidth 16 "${SOURCE}" --out "${ICONSET}/icon_16x16.png" > /dev/null 2>&1

# Create an icns file from the iconset
$ICONUTIL -c icns "${ICONSET}"

# Clean up the iconset
rm -rf "${ICONSET}"
