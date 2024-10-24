import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';
import { MediaPlayerProps, MediaPlayerRef } from './MediaPlayer';

const MediaContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyledAudio = styled.audio`
  width: 100%;
`;

const AudioPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(({ src, mediaType, tracks }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useImperativeHandle(ref, () => ({
    get currentTime() {
      return audioRef.current ? audioRef.current.currentTime : 0;
    },
    setCurrentTime(time: number) {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    },
    play() {
      audioRef.current?.play();
    },
    pause() {
      audioRef.current?.pause();
    },
  }));

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = src;
    }
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onerror = () => {
        console.error("Audio error:", audio.error);
      };
    }
  }, []);

  // Note: Audio elements don't support subtitles/captions natively.
  // If you need to display lyrics or transcriptions, you'll need to implement a custom solution.

  return (
    <MediaContainer>
      <StyledAudio ref={audioRef} controls>
        <source src={src} type={mediaType} />
        Your browser does not support the audio tag.
      </StyledAudio>
    </MediaContainer>
  );
});

export default AudioPlayer;
