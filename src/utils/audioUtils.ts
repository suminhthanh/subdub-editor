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
