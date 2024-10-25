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

export const concatenateAudioBuffers = async (
  audioContext: AudioContext,
  buffers: AudioBuffer[]
): Promise<AudioBuffer> => {
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
