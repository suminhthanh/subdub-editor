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

const StyledVideo = styled.video<{ isEditMode: boolean }>`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  width: 100%
`;

const VideoPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(
  ({ src, tracks, mediaType, audioTracks, selectedAudioTracks, selectedSubtitles }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const originalTrackRef = useRef<HTMLTrackElement>(null);
    const dubbedTrackRef = useRef<HTMLTrackElement>(null);
    const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

    const [originalSubtitlesUrl, dubbedSubtitlesUrl] = useMemo(() => {
      if (tracks.length === 0) return ['', ''];

      const createSubtitlesUrl = (textKey: 'text' | 'translated_text') => {
        const subtitles = tracks.map(track => ({
          startTime: track.start,
          duration: track.end - track.start,
          text: track[textKey]
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
      };

      return [createSubtitlesUrl('text'), createSubtitlesUrl('translated_text')];
    }, [tracks]);

    useImperativeHandle(ref, () => ({
      get currentTime() {
        return videoRef.current ? videoRef.current.currentTime : 0;
      },
      setCurrentTime(time: number) {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
          Object.values(audioElementsRef.current).forEach(audio => {
            audio.currentTime = time;
          });
        }
      },
      play() {
        videoRef.current?.play();
        Object.values(audioElementsRef.current).forEach(audio => audio.play());
      },
      pause() {
        videoRef.current?.pause();
        Object.values(audioElementsRef.current).forEach(audio => audio.pause());
      },
    }));

    useEffect(() => {
      if (originalTrackRef.current) {
        originalTrackRef.current.src = originalSubtitlesUrl;
      }
      if (dubbedTrackRef.current) {
        dubbedTrackRef.current.src = dubbedSubtitlesUrl;
      }
    }, [originalSubtitlesUrl, dubbedSubtitlesUrl]);

    useEffect(() => {
      if (originalTrackRef.current && dubbedTrackRef.current) {
        originalTrackRef.current.track.mode = selectedSubtitles === 'original' ? 'showing' : 'hidden';
        dubbedTrackRef.current.track.mode = selectedSubtitles === 'dubbed' ? 'showing' : 'hidden';
      }
    }, [selectedSubtitles]);

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

    useEffect(() => {
      Object.entries(audioTracks).forEach(([id, track]) => {
        if (!audioElementsRef.current[id]) {
          const audio = new Audio(track.url);
          audio.preload = 'auto';
          audio.muted = !selectedAudioTracks.includes(id);
          audioElementsRef.current[id] = audio;
        }
      });

      return () => {
        Object.values(audioElementsRef.current).forEach(audio => {
          audio.pause();
          audio.src = '';
        });
        audioElementsRef.current = {};
      };
    }, [audioTracks]);

    useEffect(() => {
      Object.entries(audioElementsRef.current).forEach(([id, audio]) => {
        audio.muted = !selectedAudioTracks.includes(id);
      });
    }, [selectedAudioTracks]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => {
        Object.values(audioElementsRef.current).forEach(audio => {
          audio.play();
        });
      };

      const handlePause = () => {
        Object.values(audioElementsRef.current).forEach(audio => {
          audio.pause();
        });
      };

      const handleSeeked = () => {
        const currentTime = video.currentTime;
        Object.values(audioElementsRef.current).forEach(audio => {
          audio.currentTime = currentTime;
        });
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('seeked', handleSeeked);

      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('seeked', handleSeeked);
      };
    }, []);

    return (
      <MediaContainer>
        <StyledVideo ref={videoRef} controls preload="auto" isEditMode={tracks.length > 0}>
          <source src={src} type={mediaType} />
          {originalSubtitlesUrl && (
            <track ref={originalTrackRef} kind="captions" srcLang="original" label="Original" />
          )}
          {dubbedSubtitlesUrl && (
            <track ref={dubbedTrackRef} kind="captions" srcLang="dubbed" label="Dubbed" />
          )}
          Your browser does not support the video tag.
        </StyledVideo>
      </MediaContainer>
    );
  }
);

export default VideoPlayer;
