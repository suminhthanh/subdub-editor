export const mergeArrayBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
  const totalLength = buffers.reduce(
    (acc, buffer) => acc + buffer.byteLength,
    0
  );
  const result = new ArrayBuffer(totalLength);
  const uint8Array = new Uint8Array(result);
  let offset = 0;
  for (const buffer of buffers) {
    uint8Array.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return result;
};

export const createSilentAudioBuffer = async (
  audioContext: AudioContext,
  duration: number
): Promise<AudioBuffer> => {
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(
    1,
    Math.ceil(sampleRate * duration),
    sampleRate
  );
  return buffer;
};

export const concatenateAudioBuffers = (
  audioContext: AudioContext,
  buffers: AudioBuffer[]
): AudioBuffer => {
  const totalLength = buffers.reduce((acc, buffer) => acc + buffer.length, 0);
  const result = audioContext.createBuffer(
    1,
    totalLength,
    audioContext.sampleRate
  );
  let offset = 0;

  for (const buffer of buffers) {
    result.copyToChannel(buffer.getChannelData(0), 0, offset);
    offset += buffer.length;
  }

  return result;
};

export const audioBufferToArrayBuffer = (
  audioBuffer: AudioBuffer
): ArrayBuffer => {
  const channelData = audioBuffer.getChannelData(0);
  return channelData.buffer.slice(
    channelData.byteOffset,
    channelData.byteOffset + channelData.byteLength
  );
};

export const adjustAudioSpeed = async (
  audioBuffer: AudioBuffer,
  speed: number
): Promise<AudioBuffer> => {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const adjustedLength = Math.floor(audioBuffer.length / speed);

  const offlineContext = new OfflineAudioContext(
    numberOfChannels,
    adjustedLength,
    sampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = speed;
  source.connect(offlineContext.destination);
  source.start();

  const renderedBuffer = await offlineContext.startRendering();
  return renderedBuffer;
};

export function encodeWAV(audioBuffer: AudioBuffer): Uint8Array {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const buffer = audioBuffer.getChannelData(0);
  const samples = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + samples * blockAlign);
  const view = new DataView(arrayBuffer);

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples * blockAlign, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, samples * blockAlign, true);

  const offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const value = Math.max(-1, Math.min(1, sample));
      view.setInt16(
        offset + i * blockAlign + channel * bytesPerSample,
        value * 0x7fff,
        true
      );
    }
  }

  return new Uint8Array(arrayBuffer);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function decodeWAV(wavData: Uint8Array): {
  sampleRate: number;
  numberOfChannels: number;
  samples: Float32Array;
} {
  const view = new DataView(wavData.buffer);

  // Check RIFF header
  const riffHeader = new TextDecoder().decode(wavData.slice(0, 4));
  if (riffHeader !== "RIFF") {
    console.error("Invalid WAV file: RIFF header not found");
    throw new Error("Invalid WAV file");
  }

  // Check WAVE format
  const waveFormat = new TextDecoder().decode(wavData.slice(8, 12));
  if (waveFormat !== "WAVE") {
    console.error("Invalid WAV file: WAVE format not found");
    throw new Error("Invalid WAV file");
  }

  const sampleRate = view.getUint32(24, true);
  const numberOfChannels = view.getUint16(22, true);
  const bitsPerSample = view.getUint16(34, true);

  console.log("WAV file details:");
  console.log("Sample rate:", sampleRate);
  console.log("Number of channels:", numberOfChannels);
  console.log("Bits per sample:", bitsPerSample);

  if (sampleRate <= 0 || sampleRate > 192000) {
    console.error("Invalid sample rate:", sampleRate);
    throw new Error("Invalid sample rate in WAV file");
  }

  if (numberOfChannels <= 0 || numberOfChannels > 8) {
    console.error("Invalid number of channels:", numberOfChannels);
    throw new Error("Invalid number of channels in WAV file");
  }

  if (![8, 16, 24, 32].includes(bitsPerSample)) {
    console.error("Unsupported bits per sample:", bitsPerSample);
    throw new Error("Unsupported bits per sample in WAV file");
  }

  // Find the data chunk
  let dataStart = 44; // Default data start position
  let dataLength = view.getUint32(40, true);

  // Search for the 'data' chunk
  while (
    new TextDecoder().decode(wavData.slice(dataStart, dataStart + 4)) !== "data"
  ) {
    dataStart += 8 + view.getUint32(dataStart + 4, true);
    if (dataStart >= wavData.length) {
      console.error("Data chunk not found in WAV file");
      throw new Error("Invalid WAV file structure");
    }
  }
  dataLength = view.getUint32(dataStart + 4, true);
  dataStart += 8; // Move past 'data' and chunk size

  console.log("Data chunk start:", dataStart);
  console.log("Data length:", dataLength);

  const samples = new Float32Array(dataLength / (bitsPerSample / 8));

  let offset = dataStart;
  for (let i = 0; i < samples.length; i++) {
    if (bitsPerSample === 24) {
      const sample =
        (view.getInt8(offset + 2) << 16) |
        (view.getUint8(offset + 1) << 8) |
        view.getUint8(offset);
      samples[i] = sample / 8388608.0; // 2^23
      offset += 3;
    } else if (bitsPerSample === 16) {
      samples[i] = view.getInt16(offset, true) / 32768;
      offset += 2;
    } else if (bitsPerSample === 8) {
      samples[i] = (view.getUint8(offset) - 128) / 128;
      offset += 1;
    } else if (bitsPerSample === 32) {
      samples[i] = view.getFloat32(offset, true);
      offset += 4;
    }
  }

  return { sampleRate, numberOfChannels, samples };
}
