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
