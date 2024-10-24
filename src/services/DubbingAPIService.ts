import { Track } from "../types/Track";
import { APIServiceInterface } from "./APIServiceInterface";
import { v4 as uuidv4 } from "uuid";

const API_BASE_URL = "http://localhost:8700";

interface DubbingJSON {
  utterances: Track[];
  source_language: string;
}

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

export const loadTracksFromUUID = async (
  uuid: string
): Promise<DubbingJSON> => {
  const response = await fetch(
    `${API_BASE_URL}/get_file/?uuid=${uuid}&ext=json`
  );
  if (!response.ok) {
    throw new Error("Failed to load dubbing data");
  }
  return response.json();
};

export const parseTracksFromJSON = (json: DubbingJSON): Track[] => {
  const utterances = json.utterances;

  return utterances.map((item: any) => ({
    id: uuidv4(),
    start: item.start || 0,
    end: item.end || 0,
    speaker_id: item.speaker_id || "",
    path: item.path || "",
    text: item.text || "",
    for_dubbing: item.for_dubbing || false,
    ssml_gender: item.ssml_gender || "",
    translated_text: item.translated_text || "",
    assigned_voice: item.assigned_voice || "",
    pitch: item.pitch || 0,
    speed: item.speed || 1,
    volume_gain_db: item.volume_gain_db || 0,
    dubbed_path: item.dubbed_path,
    chunk_size: item.chunk_size,
  }));
};

export const DubbingAPIService: APIServiceInterface = {
  loadVideoFromUUID,
  loadTracksFromUUID,
  parseTracksFromJSON,
};
