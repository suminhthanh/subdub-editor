import React, { useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import styled from 'styled-components';
import { Subtitle } from '../services/FFmpegService';

const VideoContainer = styled.div`
  margin-bottom: 20px;
`;

const StyledVideo = styled.video`
  width: 100%;
  max-width: 800px;
`;

interface VideoPlayerProps {
  src: string;
  subtitles: Subtitle[];
}

const VideoPlayer = forwardRef<{
  currentTime: number;
  setCurrentTime: (time: number) => void;
  play: () => void;
  pause: () => void;
}, VideoPlayerProps>(({ src, subtitles }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    get currentTime() {
      return videoRef.current ? videoRef.current.currentTime : 0;
    },
    setCurrentTime(time: number) {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    play() {
      videoRef.current?.play();
    },
    pause() {
      videoRef.current?.pause();
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
    if (videoRef.current) {
      videoRef.current.src = src;
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.onerror = () => {
        console.error("Video error:", video.error);
      };
    }
  }, []);

  return (
    <VideoContainer>
      <StyledVideo ref={videoRef} controls>
        <source src={src} type="video/mp4" />
        {subtitlesUrl && <track default kind="captions" srcLang="en" src={subtitlesUrl} />}
        Your browser does not support the video tag.
      </StyledVideo>
    </VideoContainer>
  );
});

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

export default VideoPlayer;
