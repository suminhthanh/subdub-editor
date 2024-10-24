import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import styled from 'styled-components';
import { MediaPlayerProps, MediaPlayerRef } from './MediaPlayer';
import { formatTime } from '../utils/timeUtils';

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

interface Subtitle {
  startTime: number;
  duration: number;
  text: string;
}

const VideoPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(({ src, tracks, mediaType }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);

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
    if (tracks.length === 0) return '';

    const subtitles: Subtitle[] = tracks.map(track => ({
      startTime: track.start,
      duration: track.end - track.start,
      text: track.text
    }));

    const vttContent = `WEBVTT

${subtitles.map((subtitle, index) => `
${index + 1}
${formatTime(subtitle.startTime)} --> ${formatTime(subtitle.startTime + subtitle.duration)}
${subtitle.text}
`).join('\n')}
`;

    const blob = new Blob([vttContent], { type: 'text/vtt' });
    return URL.createObjectURL(blob);
  }, [tracks]);

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.src = subtitlesUrl;
      trackRef.current.track.mode = 'showing'; // Ensure the track is showing
    }
  }, [subtitlesUrl]);

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
    <MediaContainer>
      <StyledVideo ref={videoRef} controls preload="auto">
        <source src={src} type={mediaType} />
        {subtitlesUrl && <track ref={trackRef} default kind="captions" srcLang="ca" label="Català" />}
        Your browser does not support the video tag.
      </StyledVideo>
    </MediaContainer>
  );
});

export default VideoPlayer;
