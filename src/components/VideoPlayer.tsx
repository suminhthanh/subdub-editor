import React, { useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import styled from 'styled-components';
import { Subtitle } from '../services/FFmpegService';

const MediaContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyledVideo = styled.video`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const StyledAudio = styled.audio`
  width: 100%;
`;

interface MediaPlayerProps {
  src: string;
  subtitles: Subtitle[];
  mediaType: string;
}

const MediaPlayer = forwardRef<{
  currentTime: number;
  setCurrentTime: (time: number) => void;
  play: () => void;
  pause: () => void;
}, MediaPlayerProps>(({ src, subtitles, mediaType }, ref) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  useImperativeHandle(ref, () => ({
    get currentTime() {
      return mediaRef.current ? mediaRef.current.currentTime : 0;
    },
    setCurrentTime(time: number) {
      if (mediaRef.current) {
        mediaRef.current.currentTime = time;
      }
    },
    play() {
      mediaRef.current?.play();
    },
    pause() {
      mediaRef.current?.pause();
    },
  }));

  const subtitlesUrl = useMemo(() => {
    if (subtitles.length === 0) return '';

    const vttContent = `WEBVTT

${subtitles.map((subtitle, index) => `
${index + 1}
${formatTime(subtitle.startTime)} --> ${formatTime(subtitle.startTime + subtitle.duration)}
${subtitle.text}
`).join('\n')}
`;

    const blob = new Blob([vttContent], { type: 'text/vtt' });
    return URL.createObjectURL(blob);
  }, [subtitles]);

  useEffect(() => {
    return () => {
      if (subtitlesUrl) {
        URL.revokeObjectURL(subtitlesUrl);
      }
    };
  }, [subtitlesUrl]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.src = src;
    }
  }, [src]);

  useEffect(() => {
    const media = mediaRef.current;
    if (media) {
      media.onerror = () => {
        console.error("Media error:", media.error);
      };
    }
  }, []);

  const MediaElement = mediaType.startsWith('video') ? StyledVideo : StyledAudio;

  return (
    <MediaContainer>
      <MediaElement ref={mediaRef} controls>
        <source src={src} type={mediaType} />
        {subtitlesUrl && <track default kind="captions" srcLang="en" src={subtitlesUrl} />}
        Your browser does not support the {mediaType.split('/')[0]} tag.
      </MediaElement>
    </MediaContainer>
  );
});

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

export default MediaPlayer;
