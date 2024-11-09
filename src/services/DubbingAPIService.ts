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
  id: number;
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
      id: utterance.id,
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

export const loadDubbedUtterance = async (
  uuid: string,
  id: number
): Promise<ArrayBuffer> => {
  const response = await fetch(
    `${API_BASE_URL}/get_dubbed_utterance/?uuid=${uuid}&id=${id}`
  );
  if (!response.ok) {
    throw new Error(`Failed to load dubbed utterance: ${id}`);
  }
  return response.arrayBuffer();
};

export const DubbingAPIService: DubbingAPIServiceInterface = {
  loadOriginalVocalsFromUUID,
  loadBackgroundAudioFromUUID,
  loadDubbedVocalsFromUUID,
  loadTracksFromUUID,
  parseTracksFromJSON,
  uuidExists,
  getMediaUrl,
  getSilentVideoUrl,
  loadDubbedUtterance,
};
