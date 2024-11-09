import { Track } from "../types/Track";

export interface APIServiceInterface {
  getMediaUrl: (uuid: string) => string;
  loadTracksFromUUID: (uuid: string) => Promise<any>;
  parseTracksFromJSON: (json: any) => Track[];
}

export interface DubbingAPIServiceInterface extends APIServiceInterface {
  loadOriginalVocalsFromUUID: (uuid: string) => Promise<ArrayBuffer>;
  loadBackgroundAudioFromUUID: (uuid: string) => Promise<ArrayBuffer>;
  loadDubbedVocalsFromUUID: (uuid: string) => Promise<ArrayBuffer>;
  uuidExists: (uuid: string) => Promise<boolean>;
  getSilentVideoUrl: (uuid: string) => string;
  loadDubbedUtterance: (uuid: string, id: number) => Promise<ArrayBuffer>;
}

export interface TranscriptionAPIServiceInterface extends APIServiceInterface {
  getMediaMetadata: (uuid: string) => Promise<{
    contentType: string;
    filename: string;
  }>;
}
