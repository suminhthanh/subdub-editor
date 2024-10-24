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

const TrackSelectorContainer = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 5px;
  border-radius: 5px;
`;

const CheckboxLabel = styled.label`
  display: block;
  margin-bottom: 5px;
  cursor: pointer;
`;

const Checkbox = styled.input`
  margin-right: 5px;
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
  const audioBufferSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const audioBuffersRef = useRef<AudioBuffer[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<number[]>([1, 2]); // Default to original and background

  const playSelectedTracks = (startTime: number) => {
    if (!audioContextRef.current) return;

    // Stop all currently playing tracks
    audioBufferSourcesRef.current.forEach(source => {
      source.stop();
      source.disconnect();
    });
    audioBufferSourcesRef.current = [];

    // Play only selected tracks
    selectedTracks.forEach(index => {
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

      const loadAudioTracks = async () => {
        for (let i = 0; i < audioTracks.length; i++) {
          const audioData = audioTracks[i].buffer.slice(0);
          try {
            const buffer = await audioContext.decodeAudioData(audioData);
            audioBuffersRef.current[i] = buffer;
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
  }, [audioTracks, selectedTracks]); // Add selectedTracks as a dependency

  useEffect(() => {
    if (videoRef.current && !videoRef.current.paused) {
      playSelectedTracks(videoRef.current.currentTime);
    }
  }, [selectedTracks]);

  const handleTrackChange = (index: number) => {
    setSelectedTracks(prevSelectedTracks => {
      const newSelectedTracks = prevSelectedTracks.includes(index)
        ? prevSelectedTracks.filter(i => i !== index)
        : [...prevSelectedTracks, index];
      return newSelectedTracks;
    });
  };

  return (
    <MediaContainer>
      <StyledVideo ref={videoRef} controls preload="auto">
        <source src={src} type={mediaType} />
        {subtitlesUrl && <track ref={trackRef} default kind="captions" srcLang="ca" label="Català" />}
        Your browser does not support the video tag.
      </StyledVideo>
      <TrackSelectorContainer>
        {audioTracks.map((track, index) => (
          <CheckboxLabel key={index}>
            <Checkbox
              type="checkbox"
              checked={selectedTracks.includes(index)}
              onChange={() => handleTrackChange(index)}
            />
            {track.label}
          </CheckboxLabel>
        ))}
      </TrackSelectorContainer>
    </MediaContainer>
  );
});

export default VideoPlayer;
