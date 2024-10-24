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
  position: relative; /* Establish positioning context */
`;

const StyledVideo = styled.video`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const TrackSelector = styled.select`
  position: absolute; /* Overlay on video */
  bottom: 10px; /* Position at the bottom */
  left: 10px; /* Position at the left */
  background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent background */
  color: white; /* White text color */
  border: none; /* Remove border */
  padding: 5px; /* Add some padding */
  border-radius: 5px; /* Rounded corners */
`;

interface Subtitle {
  startTime: number;
  duration: number;
  text: string;
}

interface AudioTrack {
  buffer: ArrayBuffer;
  label: string;
}

interface VideoPlayerProps extends MediaPlayerProps {
  audioTracks: AudioTrack[];
}

const VideoPlayer = forwardRef<MediaPlayerRef, VideoPlayerProps>(({ src, tracks, mediaType, audioTracks }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    get currentTime() {
      return videoRef.current ? videoRef.current.currentTime : 0;
    },
    setCurrentTime(time: number) {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        // Sync audio buffer with video time
        if (audioBufferSourceRef.current) {
          audioBufferSourceRef.current.stop();
          audioBufferSourceRef.current.disconnect();
          audioBufferSourceRef.current = null;
        }
        if (audioBufferRef.current && audioContextRef.current) {
          audioBufferSourceRef.current = audioContextRef.current.createBufferSource();
          audioBufferSourceRef.current.buffer = audioBufferRef.current;
          audioBufferSourceRef.current.connect(audioContextRef.current.destination);
          audioBufferSourceRef.current.start(0, time);
        }
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
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioContext = audioContextRef.current;

      const loadAudioTrack = (index: number) => {
        const audioData = audioTracks[index].buffer;

        // Create a copy of the ArrayBuffer to avoid detachment issues
        const audioDataCopy = audioData.slice(0);

        audioContext.decodeAudioData(audioDataCopy)
          .then(buffer => {
            audioBufferRef.current = buffer;
            // Start playing the new track from the current video time
            if (!video.paused) {
              if (audioBufferSourceRef.current) {
                audioBufferSourceRef.current.stop();
                audioBufferSourceRef.current.disconnect();
              }
              audioBufferSourceRef.current = audioContext.createBufferSource();
              audioBufferSourceRef.current.buffer = buffer;
              audioBufferSourceRef.current.connect(audioContext.destination);
              audioBufferSourceRef.current.start(0, video.currentTime);
            }
          })
          .catch(error => console.error("Error decoding audio track:", error));
      };

      loadAudioTrack(selectedTrackIndex);

      const handlePlay = () => {
        if (audioBufferRef.current) {
          if (audioBufferSourceRef.current) {
            audioBufferSourceRef.current.stop();
            audioBufferSourceRef.current.disconnect();
          }
          audioBufferSourceRef.current = audioContext.createBufferSource();
          audioBufferSourceRef.current.buffer = audioBufferRef.current;
          audioBufferSourceRef.current.connect(audioContext.destination);
          audioBufferSourceRef.current.start(0, video.currentTime);
        }
      };

      const handlePause = () => {
        if (audioBufferSourceRef.current) {
          audioBufferSourceRef.current.stop();
          audioBufferSourceRef.current.disconnect();
          audioBufferSourceRef.current = null;
        }
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [audioTracks, selectedTrackIndex]);

  const handleTrackChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newIndex = parseInt(event.target.value, 10);
    setSelectedTrackIndex(newIndex);

    // Stop the current audio playback
    if (audioBufferSourceRef.current) {
      audioBufferSourceRef.current.stop();
      audioBufferSourceRef.current.disconnect();
      audioBufferSourceRef.current = null;
    }

    // Load and start the new audio track
    const video = videoRef.current;
    if (video && audioContextRef.current) {
      const audioContext = audioContextRef.current;
      const audioData = audioTracks[newIndex].buffer;

      // Create a new ArrayBuffer from the original data
      const audioDataCopy = audioData.slice(0);

      audioContext.decodeAudioData(audioDataCopy.slice(0))
        .then(buffer => {
          audioBufferRef.current = buffer;
          if (!video.paused) {
            if (audioBufferSourceRef.current) {
              audioBufferSourceRef.current.stop();
              audioBufferSourceRef.current.disconnect();
            }
            audioBufferSourceRef.current = audioContext.createBufferSource();
            audioBufferSourceRef.current.buffer = buffer;
            audioBufferSourceRef.current.connect(audioContext.destination);
            audioBufferSourceRef.current.start(0, video.currentTime);
          }
        })
        .catch(error => console.error("Error decoding audio track:", error));
    }
  };

  return (
    <MediaContainer>
      <StyledVideo ref={videoRef} controls preload="auto">
        <source src={src} type={mediaType} />
        {subtitlesUrl && <track ref={trackRef} default kind="captions" srcLang="en" label="English" />}
        Your browser does not support the video tag.
      </StyledVideo>
      <TrackSelector value={selectedTrackIndex} onChange={handleTrackChange}>
        {audioTracks.map((track, index) => (
          <option key={index} value={index}>
            {track.label}
          </option>
        ))}
      </TrackSelector>
    </MediaContainer>
  );
});

export default VideoPlayer;
