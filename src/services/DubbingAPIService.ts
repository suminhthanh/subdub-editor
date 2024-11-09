import { Track } from "../types/Track";
import { DubbingAPIServiceInterface } from "./APIServiceInterface";
import { v4 as uuidv4 } from "uuid";
import { extractFilenameFromContentDisposition, MIME_TO_EXT } from "./utils";
import { Speaker, speakerService } from "./SpeakerService";
import { matxaSynthesisProvider } from "./MatxaSynthesisProvider";
import { getI18n } from "react-i18next";

const API_BASE_URL =
  process.env.DUBBING_API_BASE_URL || "http://192.168.178.152:8700";

type DubbingJSON = {
  start: number;
  end: number;
  speaker_id: string;
  path: string;
  text: string;
  for_dubbing: boolean;
  gender: string;
  translated_text: string;
  assigned_voice: string;
  pitch: number;
  speed: number;
  volume_gain_db: number;
  dubbed_path: string;
}[];

export const uuidExists = async (uuid: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/uuid_exists/?uuid=${uuid}`);
  if (!response.ok) {
    throw new Error("UUID does not exist");
  }
  return response.json();
};

export const getMediaUrl = (uuid: string): string => {
  return `${API_BASE_URL}/get_file/?uuid=${uuid}&ext=dub`;
};

export const getSilentVideoUrl = (uuid: string): string => {
  return `${API_BASE_URL}/get_chunk/?uuid=${uuid}&chunk_name=original_video.mp4`;
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

export const loadSilentVideoFromUUID = async (
  uuid: string
): Promise<{ url: string }> => {
  const response = await fetch(getSilentVideoUrl(uuid));
  if (!response.ok) {
    throw new Error("Failed to load silent video");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  return { url };
};

export const loadOriginalVocalsFromUUID = async (
  uuid: string
): Promise<ArrayBuffer> => {
  const response = await fetch(
    `${API_BASE_URL}/get_chunk/?uuid=${uuid}&chunk_name=htdemucs/original_audio/vocals.mp3`
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
  const response = await fetch(`${API_BASE_URL}/get_utterances?uuid=${uuid}`);
  if (!response.ok) {
    throw new Error("Failed to load dubbing data");
  }
  return response.json();
};

export const parseTracksFromJSON = (utterances: DubbingJSON): Track[] => {
  const tracks: Track[] = [];
  for (const utterance of utterances) {
    speakerService.setSpeaker({
      id: utterance.speaker_id,
      name: `${getI18n().t("speaker")} ${utterance.speaker_id.slice(-2)}`,
      voice: matxaSynthesisProvider.getVoice(utterance.assigned_voice),
    });

    tracks.push({
      id: uuidv4(),
      start: utterance.start || 0,
      end: utterance.end || 0,
      speaker_id: utterance.speaker_id,
      path: utterance.path || "",
      text: utterance.text || "",
      for_dubbing: utterance.for_dubbing || false,
      ssml_gender: utterance.gender || "",
      translated_text: utterance.translated_text || "",
      pitch: utterance.pitch || 0,
      speed: utterance.speed || 1,
      volume_gain_db: utterance.volume_gain_db || 0,
      dubbed_path: utterance.dubbed_path,
      chunk_size: 0,
      needsResynthesis: false,
    });
  }

  return tracks;
};

// Add this new function to load dubbed audio chunks
export const loadDubbedAudioChunksFromUUID = async (
  uuid: string,
  tracks: Track[]
): Promise<{ [key: string]: ArrayBuffer }> => {
  const chunkBuffers: { [key: string]: ArrayBuffer } = {};
  const dubbedTracks = tracks.filter(
    (track) => track.dubbed_path && track.for_dubbing
  );

  for (const track of dubbedTracks) {
    const chunkName = track.dubbed_path.split("/").pop();
    if (chunkName) {
      const response = await fetch(
        `${API_BASE_URL}/get_chunk/?uuid=${uuid}&chunk_name=${chunkName}`
      );
      if (!response.ok) {
        throw new Error(`Failed to load dubbed audio chunk: ${chunkName}`);
      }
      chunkBuffers[chunkName] = await response.arrayBuffer();
    }
  }

  return chunkBuffers;
};

export const loadSingleChunk = async (
  uuid: string,
  chunkName: string
): Promise<ArrayBuffer> => {
  const response = await fetch(
    `${API_BASE_URL}/get_chunk/?uuid=${uuid}&chunk_name=${chunkName}`
  );
  if (!response.ok) {
    throw new Error(`Failed to load dubbed audio chunk: ${chunkName}`);
  }
  return response.arrayBuffer();
};

export const DubbingAPIService: DubbingAPIServiceInterface = {
  loadVideoFromUUID,
  loadSilentVideoFromUUID,
  loadOriginalVocalsFromUUID,
  loadBackgroundAudioFromUUID,
  loadDubbedVocalsFromUUID,
  loadTracksFromUUID,
  parseTracksFromJSON,
  loadDubbedAudioChunksFromUUID,
  loadSingleChunk,
  uuidExists,
  getMediaUrl,
  getSilentVideoUrl,
};
