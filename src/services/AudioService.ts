import { Track } from "../types/Track";
import {
  adjustAudioSpeed,
  concatenateAudioBuffers,
  createSilentAudioBuffer,
  audioBufferToArrayBuffer,
} from "../utils/audioUtils";
import { synthesisService } from "./SynthesisService";
import { Voice } from "../types/Voice";
import { speakerService } from "./SpeakerService";

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
      let chunkBuffer = chunkBuffers[chunkKey];

      if (!chunkBuffer || track.needsResynthesis) {
        try {
          chunkBuffer = await this.resynthesizeTrack(track);
          chunkBuffers[chunkKey] = chunkBuffer;
          // Reset the needsResynthesis flag after successful resynthesis
          track.needsResynthesis = false;
        } catch (error) {
          console.error(`Failed to resynthesize track ${track.id}:`, error);
          // If resynthesis fails, we'll skip this track
          continue;
        }
      }

      // Decode the chunk buffer
      let chunkAudioBuffer: AudioBuffer;
      try {
        chunkAudioBuffer = await this.audioContext.decodeAudioData(
          chunkBuffer.slice(0)
        );
      } catch (error) {
        console.error(
          `Failed to decode audio data for track ${track.id}:`,
          error
        );
        // If decoding fails, we'll skip this track
        continue;
      }

      // Adjust the speed of the chunk
      const speedAdjustedBuffer = await adjustAudioSpeed(
        chunkAudioBuffer,
        track.speed || 1
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

  private async resynthesizeTrack(track: Track): Promise<ArrayBuffer> {
    console.log(`Resynthesizing track: ${track.id}`);
    return await synthesisService.speak(
      track.translated_text || "",
      speakerService.getSpeakerById(track.speaker_id).voice
    );
  }

  audioBufferToArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
    return audioBufferToArrayBuffer(audioBuffer);
  }
}

export const audioService = new AudioService();
