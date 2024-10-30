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
  loadOriginalVocalsFromUUID: (uuid: string) => Promise<ArrayBuffer>;
  loadBackgroundAudioFromUUID: (uuid: string) => Promise<ArrayBuffer>;
  loadDubbedVocalsFromUUID: (uuid: string) => Promise<ArrayBuffer>;
  loadDubbedAudioChunksFromUUID: (
    uuid: string,
    tracks: Track[]
  ) => Promise<{ [key: string]: ArrayBuffer }>;
  loadSingleChunk: (uuid: string, chunkName: string) => Promise<ArrayBuffer>;
  uuidExists: (uuid: string) => Promise<boolean>;
  getMediaUrl: (uuid: string) => string;
}
