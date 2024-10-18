import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
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
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useImperativeHandle(ref, () => ({
    get currentTime() {
      return playerRef.current ? playerRef.current.currentTime() : 0;
    },
  }));

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      preload: 'auto',
    });

    playerRef.current.ready(() => {
      setIsPlayerReady(true);
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      playerRef.current.src({ type: 'video/mp4', src: src });

      if (subtitles && subtitles.length > 0) {
        const track = playerRef.current.textTracks()[0] || playerRef.current.addTextTrack('captions', 'English', 'en');
        track.mode = 'showing';
        
        // Clear existing cues
        while (track.cues && track.cues.length > 0) {
          track.removeCue(track.cues[0]);
        }

        // Add new cues
        subtitles.forEach((subtitle) => {
          const cue = new VTTCue(
            subtitle.startTime,
            subtitle.startTime + subtitle.duration,
            subtitle.text
          );
          track.addCue(cue);
        });
      }
    }
  }, [isPlayerReady, src, subtitles]);

  return (
    <VideoContainer>
      <div data-vjs-player>
        <video ref={videoRef} className="video-js" />
      </div>
    </VideoContainer>
  );
});

export default VideoPlayer;
