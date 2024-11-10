import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
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
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const audioBuffersRef = useRef<{ [key: string]: AudioBuffer }>({});

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

    const playSelectedTracks = (startTime: number) => {
      if (!audioContextRef.current) return;

      // Stop all currently playing tracks
      audioBufferSourcesRef.current.forEach(source => {
        source.stop();
        source.disconnect();
      });
      audioBufferSourcesRef.current = [];

      // Play only selected tracks
      selectedAudioTracks.forEach((value) => {
        if (audioBuffersRef.current[value]) {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = audioBuffersRef.current[value];
          source.connect(audioContextRef.current!.destination);
          source.start(0, startTime);
          audioBufferSourcesRef.current.push(source);
        }
      });
    };

    useImperativeHandle(ref, () => ({
      get currentTime() {
        return videoRef.current ? videoRef.current.currentTime : 0;
      },
      setCurrentTime(time: number) {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
          playSelectedTracks(time);
        }
      },
      play() {
        videoRef.current?.play();
      },
      pause() {
        videoRef.current?.pause();
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
      const video = videoRef.current;
      if (video && Object.keys(audioTracks).length > 0) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const audioContext = audioContextRef.current;

        const loadAudioTracks = async () => {
          for (const [id, track] of Object.entries(audioTracks)) {
            try {
              let buffer: AudioBuffer;
              const trackBuffer = track.buffer;
              if (trackBuffer instanceof AudioBuffer) {
                buffer = trackBuffer;
              } else {
                const audioData = trackBuffer.slice(0);
                buffer = await audioContext.decodeAudioData(audioData);
              }
              audioBuffersRef.current[id] = buffer;
              console.log(`Successfully loaded audio track ${id}: ${track.label}`);
            } catch (error) {
              console.error(`Error decoding audio track ${id}:`, error);
            }
          }
        };

        loadAudioTracks();

        const handlePlay = () => {
          playSelectedTracks(video.currentTime);
          video.play();
        };

        const handlePause = () => {
          audioBufferSourcesRef.current.forEach(source => source.stop());
        };

        const handleSeeked = () => {
          playSelectedTracks(video.currentTime);
          video.play();
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeked', handleSeeked);

        return () => {
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          video.removeEventListener('seeked', handleSeeked);
          audioBufferSourcesRef.current.forEach(source => {
            source.stop();
            source.disconnect();
          });
        };
      }
    }, [audioTracks, selectedAudioTracks]);

    useEffect(() => {
      if (videoRef.current && !videoRef.current.paused) {
        playSelectedTracks(videoRef.current.currentTime);
      }
    }, [selectedAudioTracks]);

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
