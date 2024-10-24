import { Track } from "../types/Track";
import { DubbingAPIServiceInterface } from "./APIServiceInterface";
import { v4 as uuidv4 } from "uuid";
import { extractFilenameFromContentDisposition, MIME_TO_EXT } from "./utils";

const API_BASE_URL = "http://192.168.178.152:8700";

interface DubbingJSON {
  utterances: Track[];
  source_language: string;
}

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

export const loadSilentVideoFromUUID = async (
  uuid: string
): Promise<{ url: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/get_chunk/?uuid=${uuid}&chunk_name=original_video.mp4`
  );
  if (!response.ok) {
    throw new Error("Failed to load silent video");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  return { url };
};

export const loadOriginalAudioFromUUID = async (
  uuid: string
): Promise<ArrayBuffer> => {
  const response = await fetch(
    `${API_BASE_URL}/get_chunk/?uuid=${uuid}&chunk_name=original_audio.mp3`
  );
  if (!response.ok) {
    throw new Error("Failed to load original audio");
  }
  return response.arrayBuffer();
};

export const loadDubbedVocalsFromUUID = async (
  uuid: string
): Promise<ArrayBuffer> => {
  const response = await fetch(
    `${API_BASE_URL}/get_chunk/?uuid=${uuid}&chunk_name=dubbed_vocals.mp3`
  );
  if (!response.ok) {
    throw new Error("Failed to load original audio");
  }
  return response.arrayBuffer();
};

export const loadBackgroundAudioFromUUID = async (
  uuid: string
): Promise<ArrayBuffer> => {
  const response = await fetch(
    `${API_BASE_URL}/get_chunk/?uuid=${uuid}&chunk_name=htdemucs/original_audio/no_vocals.mp3`
  );
  if (!response.ok) {
    throw new Error("Failed to load background audio");
  }
  return response.arrayBuffer();
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

export const DubbingAPIService: DubbingAPIServiceInterface = {
  loadVideoFromUUID,
  loadSilentVideoFromUUID,
  loadOriginalAudioFromUUID,
  loadBackgroundAudioFromUUID,
  loadDubbedVocalsFromUUID,
  loadTracksFromUUID,
  parseTracksFromJSON,
};
