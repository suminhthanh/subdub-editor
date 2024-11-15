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

class AudioService {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }

  async recreateConstructedAudio(
    tracks: Track[],
    chunkBuffers: { [key: string]: ArrayBuffer }
  ): Promise<AudioBuffer> {
    console.log("Recreating constructed audio in AudioService...");
    const dubbedTracks = tracks
      .filter(
        (track) => track.dubbed_path && track.for_dubbing && !track.deleted
      )
      .sort((a, b) => a.start - b.start);

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
        currentTime = track.start;
      }

      // Get the chunk buffer for this track
      const chunkKey = track.dubbed_path.split("/").pop() || "";
      let chunkBuffer = chunkBuffers[chunkKey];

      if (!chunkBuffer && !track.needsResynthesis) {
        continue;
      }

      if (track.needsResynthesis) {
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

      if (chunkBuffer) {
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
    return concatenateAudioBuffers(this.audioContext, audioBuffers.slice(0));
  }

  async resynthesizeTrack(track: Track): Promise<ArrayBuffer> {
    console.log(`Resynthesizing track: ${track.id}`);
    return await synthesisService.speak(
      track.translated_text || "",
      speakerService.getSpeakerById(track.speaker_id).voice
    );
  }

  audioBufferToArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
    return audioBufferToArrayBuffer(audioBuffer);
  }

  decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  async downloadAudioURL(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    return response.arrayBuffer();
  }

  async mixAudioBuffers(
    buffer1: AudioBuffer,
    buffer2: AudioBuffer
  ): Promise<AudioBuffer> {
    const numberOfChannels = Math.max(
      buffer1.numberOfChannels,
      buffer2.numberOfChannels
    );
    const length = Math.max(buffer1.length, buffer2.length);
    const mixedBuffer = this.audioContext.createBuffer(
      numberOfChannels,
      length,
      buffer1.sampleRate
    );

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const mixedChannelData = mixedBuffer.getChannelData(channel);
      const buffer1ChannelData = buffer1.getChannelData(
        channel % buffer1.numberOfChannels
      );
      const buffer2ChannelData = buffer2.getChannelData(
        channel % buffer2.numberOfChannels
      );

      for (let i = 0; i < length; i++) {
        mixedChannelData[i] =
          (buffer1ChannelData[i] || 0) + (buffer2ChannelData[i] || 0);
      }
    }

    return mixedBuffer;
  }

  audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const interleaved = this.interleave(buffer);
    const dataView = this.createWavFileHeader(
      interleaved.length,
      buffer.numberOfChannels,
      buffer.sampleRate
    );
    return this.mergeBuffers(dataView, interleaved);
  }

  private interleave(buffer: AudioBuffer): Float32Array {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels;
    const result = new Float32Array(length);

    let index = 0;
    let inputIndex = 0;

    while (index < length) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        result[index++] = buffer.getChannelData(channel)[inputIndex];
      }
      inputIndex++;
    }
    return result;
  }

  private createWavFileHeader(
    dataLength: number,
    numChannels: number,
    sampleRate: number
  ): DataView {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLength * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataLength * 2, true);

    return view;
  }

  private mergeBuffers(wav0: DataView, wav1: ArrayBuffer): ArrayBuffer {
    const result = new ArrayBuffer(wav0.buffer.byteLength + wav1.byteLength);
    const resultView = new Uint8Array(result);
    resultView.set(new Uint8Array(wav0.buffer), 0);
    resultView.set(new Uint8Array(wav1), wav0.buffer.byteLength);
    return result;
  }
}

export const audioService = new AudioService();
