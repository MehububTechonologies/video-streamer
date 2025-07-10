#!/bin/bash

# --- Script Logic ---

# The base directory where all videos are stored
BASE_VIDEO_DIR="./media/videos"

echo "Starting video conversion process..."
echo "Scanning for unconverted videos in ${BASE_VIDEO_DIR}..."

# Find all .mp4 files, excluding any in directories that look like HLS output folders
find "${BASE_VIDEO_DIR}" -type f -name "*.mp4" | while read INPUT_FILE; do
    # Define the output directory by removing the .mp4 extension from the input file path
    OUTPUT_DIR="${INPUT_FILE%.mp4}"

    # Check if the output directory already exists
    if [ -d "${OUTPUT_DIR}" ]; then
        echo "Video '${INPUT_FILE}' already has a conversion directory. Skipping."
        continue
    fi

    echo "-----------------------------------------------------"
    echo "Found new video to convert: ${INPUT_FILE}"
    echo "Output will be in: ${OUTPUT_DIR}"
    echo "-----------------------------------------------------"

    # Create the output directory
    mkdir -p "${OUTPUT_DIR}"

    # Run the FFmpeg command for HLS conversion, redirecting stdin to prevent it from consuming the pipe
    ffmpeg -i "${INPUT_FILE}" -loglevel error < /dev/null \
    -filter_complex \
    "[0:v]split=3[v1][v2][v3]; \
     [v1]scale=w=1920:h=1080[v1out]; \
     [v2]scale=w=1280:h=720[v2out]; \
     [v3]scale=w=854:h=480[v3out]" \
    -map "[v1out]" -c:v:0 libx264 -profile:v:0 main -crf 20 -b:v:0 5000k -maxrate:v:0 5000k -bufsize:v:0 10000k \
    -map "[v2out]" -c:v:1 libx264 -profile:v:1 main -crf 20 -b:v:1 2800k -maxrate:v:1 2800k -bufsize:v:1 5600k \
    -map "[v3out]" -c:v:2 libx264 -profile:v:2 main -crf 20 -b:v:2 1400k -maxrate:v:2 1400k -bufsize:v:2 2800k \
    -map a:0 -c:a:0 aac -b:a:0 128k -ar 48000 \
    -map a:0 -c:a:1 aac -b:a:1 128k -ar 48000 \
    -map a:0 -c:a:2 aac -b:a:2 128k -ar 48000 \
    -f hls \
    -hls_time 6 \
    -hls_playlist_type vod \
    -hls_segment_filename "${OUTPUT_DIR}/stream_%v/data%04d.ts" \
    -master_pl_name master.m3u8 \
    -var_stream_map "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p" \
    "${OUTPUT_DIR}/stream_%v.m3u8"

    echo "Conversion for '${INPUT_FILE}' finished. Fixing playlist paths..."

    # This loop fixes the paths inside the generated .m3u8 files
    for playlist in "${OUTPUT_DIR}"/stream_*.m3u8; do
        stream_name=$(basename "$playlist" .m3u8)
        # Use awk to prepend the subdirectory to the .ts files
        awk -v subdir="$stream_name/" '/\.ts$/ {print subdir $0} !/\.ts$/ {print}' "$playlist" > "$playlist.tmp" && mv "$playlist.tmp" "$playlist"
    done

    echo "Path fixing for '${INPUT_FILE}' finished successfully!"

done

echo "-----------------------------------------------------"
echo "All processing complete. No more videos to convert."
echo "-----------------------------------------------------"