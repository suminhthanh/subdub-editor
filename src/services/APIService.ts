import { Subtitle } from "./FFmpegService";

const API_BASE_URL = "https://api.softcatala.org/transcribe-service/v1";

export const loadVideoFromUUID = async (uuid: string): Promise<string> => {
  const response = await fetch(
    `${API_BASE_URL}/get_file/?uuid=${uuid}&ext=bin`
  );
  if (!response.ok) {
    throw new Error("Failed to load video");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
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
