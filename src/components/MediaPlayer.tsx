import React, { forwardRef } from 'react';
import { Subtitle } from '../services/FFmpegService';
import VideoPlayer from './VideoPlayer';
import AudioPlayer from './AudioPlayer';

export interface MediaPlayerProps {
  src: string;
  subtitles: Subtitle[];
  mediaType: string;
}

export interface MediaPlayerRef {
  currentTime: number;
  setCurrentTime: (time: number) => void;
  play: () => void;
  pause: () => void;
}

const MediaPlayer: React.ForwardRefRenderFunction<MediaPlayerRef, MediaPlayerProps> = (props, ref) => {
  const isVideo = props.mediaType.startsWith('video');
  return isVideo ? <VideoPlayer {...props} ref={ref} /> : <AudioPlayer {...props} ref={ref} />;
};

export default forwardRef(MediaPlayer);
