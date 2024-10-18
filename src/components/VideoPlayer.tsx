import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import styled from 'styled-components';
import { Subtitle } from '../services/FFmpegService';

const VideoContainer = styled.div`
  margin-bottom: 20px;
`;

interface VideoPlayerProps {
  src: string;
  subtitles: Subtitle[];
}

const VideoPlayer = forwardRef<{ currentTime: number }, VideoPlayerProps>(({ src, subtitles }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<videojs.Player | null>(null);

  useImperativeHandle(ref, () => ({
    get currentTime() {
      return playerRef.current ? playerRef.current.currentTime() : 0;
    },
  }));

  useEffect(() => {
    if (!playerRef.current) {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      playerRef.current = videojs(videoElement, {
        controls: true,
        fluid: true,
        sources: [{ src, type: 'video/mp4' }],
      });
    } else {
      playerRef.current.src({ src, type: 'video/mp4' });
    }

    // Add subtitles to the video
    if (subtitles && subtitles.length > 0) {
      const track = playerRef.current.addTextTrack('captions', 'English', 'en');
      subtitles.forEach((subtitle) => {
        track.addCue(
          new VTTCue(
            subtitle.startTime,
            subtitle.startTime + subtitle.duration,
            subtitle.text
          )
        );
      });
      track.mode = 'showing';
    }
  }, [src, subtitles]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

  return (
    <VideoContainer>
      <div data-vjs-player>
        <video ref={videoRef} className="video-js" />
      </div>
    </VideoContainer>
  );
});

export default VideoPlayer;
