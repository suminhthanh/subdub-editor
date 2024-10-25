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

interface AudioTrack {
  buffer: ArrayBuffer | AudioBuffer;
  label: string;
}

interface Subtitle {
  startTime: number;
  duration: number;
  text: string;
}


const VideoPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(
  ({ src, tracks, mediaType, audioTracks, selectedAudioTracks }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const trackRef = useRef<HTMLTrackElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const audioBuffersRef = useRef<AudioBuffer[]>([]);

    const subtitlesUrl = useMemo(() => {
      if (tracks.length === 0) return '';

      const subtitles: Subtitle[] = tracks.map(track => ({
        startTime: track.start,
        duration: track.end - track.start,
        text: track.translated_text
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

    const playSelectedTracks = (startTime: number) => {
      if (!audioContextRef.current) return;

      // Stop all currently playing tracks
      audioBufferSourcesRef.current.forEach(source => {
        source.stop();
        source.disconnect();
      });
      audioBufferSourcesRef.current = [];

      // Play only selected tracks
      selectedAudioTracks.forEach(index => {
        if (audioBuffersRef.current[index]) {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = audioBuffersRef.current[index];
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
      if (trackRef.current) {
        trackRef.current.src = subtitlesUrl;
        trackRef.current.track.mode = 'showing'; // Ensure the track is showing
      }
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

    useEffect(() => {
      const video = videoRef.current;
      if (video && audioTracks.length > 0) {
        console.log("Received new audio tracks in VideoPlayer:", audioTracks);
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const audioContext = audioContextRef.current;

        const loadAudioTracks = async () => {
          for (let i = 0; i < audioTracks.length; i++) {
            try {
              let buffer: AudioBuffer;
              const trackBuffer = audioTracks[i].buffer;
              if (trackBuffer instanceof AudioBuffer) {
                buffer = trackBuffer;
              } else {
                const audioData = trackBuffer.slice(0);
                buffer = await audioContext.decodeAudioData(audioData);
              }
              audioBuffersRef.current[i] = buffer;
              console.log(`Successfully loaded audio track ${i}: ${audioTracks[i].label}`);
            } catch (error) {
              console.error(`Error decoding audio track ${i}:`, error);
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
        <StyledVideo ref={videoRef} controls preload="auto">
          <source src={src} type={mediaType} />
          {subtitlesUrl && <track ref={trackRef} default kind="captions" srcLang="ca" label="Català" />}
          Your browser does not support the video tag.
        </StyledVideo>
      </MediaContainer>
    );
  }
);

export default VideoPlayer;
