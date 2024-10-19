import { Subtitle } from "./FFmpegService";

const API_BASE_URL = "https://api.softcatala.org/transcribe-service/v1";

const MIME_TO_EXT: { [key: string]: string } = {
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

export const loadVideoFromUUID = async (
  uuid: string
): Promise<{ url: string; contentType: string; filename: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/get_file/?uuid=${uuid}&ext=bin`
  );
  if (!response.ok) {
    throw new Error("Failed to load video");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const contentType = response.headers.get("content-type") || "video/mp4";

  const contentDisposition = response.headers.get("content-disposition");
  let filename = extractFilenameFromContentDisposition(contentDisposition);

  if (filename === "input") {
    const ext = MIME_TO_EXT[contentType] || "mp4";
    filename = `input.${ext}`;
  }

  return { url, contentType, filename };
};

export const loadSubtitlesFromUUID = async (uuid: string): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/get_file/?uuid=${uuid}&ext=json`
  );
  if (!response.ok) {
    throw new Error("Failed to load subtitles");
  }
  return response.json();
};

export const parseSubtitlesFromJSON = (json: any): Subtitle[] => {
  return json.segments.map((segment: any) => ({
    startTime: segment.start,
    duration: segment.end - segment.start,
    text: segment.text.trim(),
  }));
};
