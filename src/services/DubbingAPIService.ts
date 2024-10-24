import { Track } from "../types/Track";
import { DubbingAPIServiceInterface } from "./APIServiceInterface";
import { v4 as uuidv4 } from "uuid";
import { extractFilenameFromContentDisposition, MIME_TO_EXT } from "./utils";
import {
  createSilentAudioBuffer,
  concatenateAudioBuffers,
  adjustAudioSpeed,
} from "../utils/audioUtils";

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

// Add this new function to load dubbed audio chunks
export const loadDubbedAudioChunksFromUUID = async (
  uuid: string,
  tracks: Track[]
): Promise<AudioBuffer> => {
  const audioContext = new AudioContext();
  const dubbedTracks = tracks
    .filter((track) => track.dubbed_path && track.for_dubbing)
    .sort((a, b) => a.start - b.start);

  if (dubbedTracks.length === 0) {
    throw new Error("No dubbed tracks found");
  }

  const audioBuffers: AudioBuffer[] = [];
  let currentTime = 0;

  // Add initial silence if the first track doesn't start at 0
  if (dubbedTracks[0].start > 0) {
    const initialSilence = await createSilentAudioBuffer(
      audioContext,
      dubbedTracks[0].start
    );
    audioBuffers.push(initialSilence);
    currentTime = dubbedTracks[0].start;
  }

  for (const track of dubbedTracks) {
    // Add silence if there's a gap
    if (track.start > currentTime) {
      const silenceDuration = track.start - currentTime;
      const silenceBuffer = await createSilentAudioBuffer(
        audioContext,
        silenceDuration
      );
      audioBuffers.push(silenceBuffer);
    }

    // Load and add the dubbed audio chunk
    const response = await fetch(
      `${API_BASE_URL}/get_chunk/?uuid=${uuid}&chunk_name=${track.dubbed_path
        .split("/")
        .pop()}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load dubbed audio chunk: ${track.dubbed_path}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Adjust the audio buffer based on the speed
    const speedAdjustedBuffer = await adjustAudioSpeed(
      audioContext,
      audioBuffer,
      track.speed
    );
    audioBuffers.push(speedAdjustedBuffer);

    // Update currentTime based on the adjusted duration
    const adjustedDuration = speedAdjustedBuffer.duration;
    currentTime = track.start + adjustedDuration;
  }

  // Add silence at the end if the last track ends before the video duration
  const videoDuration = tracks[tracks.length - 1].end; // Assuming the last track's end time is the video duration
  if (currentTime < videoDuration) {
    const finalSilenceDuration = videoDuration - currentTime;
    const finalSilence = await createSilentAudioBuffer(
      audioContext,
      finalSilenceDuration
    );
    audioBuffers.push(finalSilence);
  }

  // Concatenate all audio buffers
  const result = await concatenateAudioBuffers(audioContext, audioBuffers);
  return result;
};

export const DubbingAPIService: DubbingAPIServiceInterface = {
  loadVideoFromUUID,
  loadSilentVideoFromUUID,
  loadOriginalAudioFromUUID,
  loadBackgroundAudioFromUUID,
  loadDubbedVocalsFromUUID,
  loadTracksFromUUID,
  parseTracksFromJSON,
  loadDubbedAudioChunksFromUUID,
};
