export const MIME_TO_EXT: { [key: string]: string } = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "application/ogg": "ogg",
  "audio/flac": "flac",
  "video/x-msvideo": "avi",
  "video/mp4": "mp4",
  "video/x-matroska": "mkv",
  "video/quicktime": "mov",
  "video/mts": "mts",
};

export const extractFilenameFromContentDisposition = (
  contentDisposition: string | null
): string => {
  if (!contentDisposition) return "input";

  const filenameMatch = contentDisposition.match(/filename="?([^;]+)"?/i);
  if (filenameMatch) {
    return filenameMatch[1].replace(/['"]/g, "");
  }

  return "input";
};
