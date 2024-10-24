import { Track } from "../types/Track";

export interface APIServiceInterface {
  loadVideoFromUUID: (uuid: string) => Promise<{
    url: string;
    contentType: string;
    filename: string;
  }>;
  loadTracksFromUUID: (uuid: string) => Promise<any>;
  parseTracksFromJSON: (json: any) => Track[];
}

export interface DubbingAPIServiceInterface extends APIServiceInterface {
  loadSilentVideoFromUUID: (uuid: string) => Promise<{ url: string }>;
  loadOriginalAudioFromUUID: (uuid: string) => Promise<{ url: string }>;
  loadBackgroundAudioFromUUID: (uuid: string) => Promise<{ url: string }>;
  loadAudioChunkFromUUID?: (
    uuid: string,
    chunk_name: string
  ) => Promise<{ url: string }>;
}
