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
  loadOriginalAudioFromUUID: (uuid: string) => Promise<ArrayBuffer>;
  loadBackgroundAudioFromUUID: (uuid: string) => Promise<ArrayBuffer>;
  loadDubbedVocalsFromUUID: (uuid: string) => Promise<ArrayBuffer>;
  loadDubbedAudioChunksFromUUID: (
    uuid: string,
    tracks: Track[]
  ) => Promise<AudioBuffer>;
}
