import { Track } from "../types/Track";
import {
  adjustAudioSpeed,
  concatenateAudioBuffers,
  createSilentAudioBuffer,
} from "../utils/audioUtils";

export class AudioService {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new AudioContext();
  }

  async recreateConstructedAudio(
    tracks: Track[],
    chunkBuffers: { [key: string]: ArrayBuffer }
  ): Promise<AudioBuffer> {
    console.log("Recreating constructed audio in AudioService...");
    const dubbedTracks = tracks
      .filter((track) => track.dubbed_path && track.for_dubbing)
      .sort((a, b) => a.start - b.start);

    console.log("Dubbed tracks:", dubbedTracks);

    if (dubbedTracks.length === 0) {
      throw new Error("No dubbed tracks found");
    }

    const audioBuffers: AudioBuffer[] = [];
    let currentTime = 0;

    // Add initial silence if the first track doesn't start at 0
    if (dubbedTracks[0].start > 0) {
      const initialSilence = await createSilentAudioBuffer(
        this.audioContext,
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
          this.audioContext,
          silenceDuration
        );
        audioBuffers.push(silenceBuffer);
      }

      // Get the chunk buffer for this track
      const chunkKey = track.dubbed_path.split("/").pop() || "";
      const chunkBuffer = chunkBuffers[chunkKey];

      if (!chunkBuffer) {
        console.error(`Chunk buffer not found for track: ${track.id}`);
        continue;
      }

      // Decode the chunk buffer
      const chunkAudioBuffer = await this.audioContext.decodeAudioData(
        chunkBuffer.slice(0)
      );

      // Adjust the speed of the chunk
      const speedAdjustedBuffer = await adjustAudioSpeed(
        this.audioContext,
        chunkAudioBuffer,
        track.speed
      );
      audioBuffers.push(speedAdjustedBuffer);
      currentTime = track.start + speedAdjustedBuffer.duration;
    }

    // Add silence at the end if the last track ends before the video duration
    const videoDuration = tracks[tracks.length - 1].end;
    if (currentTime < videoDuration) {
      const finalSilenceDuration = videoDuration - currentTime;
      const finalSilence = await createSilentAudioBuffer(
        this.audioContext,
        finalSilenceDuration
      );
      audioBuffers.push(finalSilence);
    }

    console.log("Finished recreating constructed audio");
    return await concatenateAudioBuffers(this.audioContext, audioBuffers);
  }
}

export const audioService = new AudioService();
