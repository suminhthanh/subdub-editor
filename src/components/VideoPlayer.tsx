import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import styled from 'styled-components';
import { MediaPlayerProps, MediaPlayerRef } from './MediaPlayer';
import { formatTime } from '../utils/timeUtils';
import { Track } from '../types/Track';

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
  width: ${props => props.isEditMode ? 'auto' : '100%'};
`;

const VideoPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(
  ({ src, tracks, mediaType, audioTracks, selectedAudioTracks, selectedSubtitles, advancedEditMode, dubbedAudioBuffer }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const originalTrackRef = useRef<HTMLTrackElement>(null);
    const dubbedTrackRef = useRef<HTMLTrackElement>(null);
    const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
    const trackAudioContextRef = useRef<AudioContext | null>(null);
    const trackSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferSourcesRef = useRef<AudioBufferSourceNode[]>([]);

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
          videoRef.current.play();
          // Handle HTML audio elements
          Object.values(audioElementsRef.current).forEach(audio => {
            audio.currentTime = time;
          });
          playBufferTracks(time);
        }
      },
      play() {
        if (videoRef.current) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              // Play HTML audio elements
              Object.values(audioElementsRef.current).forEach(audio => {
                const audioPlayPromise = audio.play();
                if (audioPlayPromise !== undefined) {
                  audioPlayPromise.catch(error => {
                    console.log("Audio play prevented:", error);
                  });
                }
              });
              
              // Play buffer sources
              playBufferTracks(videoRef.current!.currentTime);
            }).catch(error => {
              console.log("Video play prevented:", error);
            });
          }
        }
      },
      pause() {
        if (videoRef.current) {
          videoRef.current.pause();
          // Pause HTML audio elements
          Object.values(audioElementsRef.current).forEach(audio => {
            audio.pause();
          });
          // Stop buffer sources
          audioBufferSourcesRef.current.forEach(source => {
            try {
              source.stop();
              source.disconnect();
            } catch (error) {
              console.error("Error stopping audio source:", error);
            }
          });
          audioBufferSourcesRef.current = [];
        }
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

    const playBufferTracks = (startTime: number) => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      console.log('[Audio] Stopping all buffer sources');
      // Stop all currently playing buffer sources
      audioBufferSourcesRef.current.forEach(source => {
        try {
          source.stop();
          source.disconnect();
        } catch (error) {
          console.error("Error stopping audio source:", error);
        }
      });
      audioBufferSourcesRef.current = [];

      // In advanced mode, only play the dubbed audio buffer if it exists
      if (advancedEditMode && selectedAudioTracks.includes('dubbed')) {
        if (dubbedAudioBuffer) {
          console.log('[Audio] Playing dubbed audio buffer in advanced mode');
          const source = audioContextRef.current.createBufferSource();
          source.buffer = dubbedAudioBuffer;
          source.connect(audioContextRef.current.destination);
          source.start(0, startTime);
          audioBufferSourcesRef.current.push(source);
        } else {
          console.log('[Audio] No dubbed audio buffer available, using URL source');
        }
      }
    };

    // Update audio elements when tracks change
    useEffect(() => {
      console.log('[Audio] Setting up audio elements', {
        advancedMode: advancedEditMode,
        hasDubbedBuffer: !!dubbedAudioBuffer,
        tracks: Object.keys(audioTracks)
      });

      // Clear existing audio elements
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause();
      });
      audioElementsRef.current = {};

      // Create audio elements for tracks
      Object.entries(audioTracks).forEach(([id, audioTrack]) => {
        // In advanced mode, only create dubbed audio element if there's no buffer
        if (advancedEditMode && id === 'dubbed' && dubbedAudioBuffer) {
          console.log('[Audio] Skipping dubbed audio URL in advanced mode (using buffer)');
          return;
        }
        
        if (audioTrack.url) {
          console.log(`[Audio] Creating audio element for ${id}`);
          const audio = new Audio(audioTrack.url);
          audio.preload = 'auto';
          audio.muted = !selectedAudioTracks.includes(id);
          
          if (videoRef.current) {
            audio.currentTime = videoRef.current.currentTime;
          }
          
          if (videoRef.current && !videoRef.current.paused) {
            audio.play().catch(error => {
              console.log(`[Audio] Play prevented for ${id}:`, error);
            });
          }
          
          audioElementsRef.current[id] = audio;
        }
      });

      return () => {
        console.log('[Audio] Cleaning up audio elements');
        Object.values(audioElementsRef.current).forEach(audio => {
          audio.pause();
        });
        audioElementsRef.current = {};
      };
    }, [audioTracks, dubbedAudioBuffer, advancedEditMode]);

    // Handle selected tracks changes
    useEffect(() => {
      console.log('[Audio] Selected tracks changed:', selectedAudioTracks);
      
      // Update HTML audio elements
      Object.entries(audioElementsRef.current).forEach(([id, audio]) => {
        const shouldBeMuted = !selectedAudioTracks.includes(id);
        console.log(`[Audio] ${id} muted:`, shouldBeMuted);
        audio.muted = shouldBeMuted;
      });

      // Update buffer-based tracks if video is playing
      if (videoRef.current && !videoRef.current.paused) {
        playBufferTracks(videoRef.current.currentTime);
      }
    }, [audioTracks, dubbedAudioBuffer, selectedAudioTracks]);

    // Sync video and audio playback
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => {
        console.log('[Video] Play event');
        // Play HTML audio elements
        Object.entries(audioElementsRef.current).forEach(([id, audio]) => {
          console.log(`[Audio] Playing ${id}`);
          audio.play().catch(error => {
            console.log(`[Audio] Play prevented for ${id}:`, error);
          });
        });

        // Play buffer-based tracks
        playBufferTracks(video.currentTime);
      };

      const handlePause = () => {
        console.log('[Video] Pause event');
        // Pause HTML audio elements
        Object.entries(audioElementsRef.current).forEach(([id, audio]) => {
          console.log(`[Audio] Pausing ${id}`);
          audio.pause();
        });

        // Stop buffer-based tracks
        audioBufferSourcesRef.current.forEach(source => {
          try {
            source.stop();
            source.disconnect();
          } catch (error) {
            console.error("Error stopping audio source:", error);
          }
        });
        audioBufferSourcesRef.current = [];
      };

      const handleSeeked = () => {
        console.log('[Video] Seeked event');
        const currentTime = video.currentTime;
        // Update HTML audio elements
        Object.entries(audioElementsRef.current).forEach(([id, audio]) => {
          console.log(`[Audio] Seeking ${id} to ${currentTime}`);
          audio.currentTime = currentTime;
        });
        
        // Restart buffer-based tracks if playing
        if (!video.paused) {
          playBufferTracks(currentTime);
        }
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('seeked', handleSeeked);

      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('seeked', handleSeeked);
      };
    }, [audioTracks, dubbedAudioBuffer, selectedAudioTracks]);

    useEffect(() => {
      if (audioElementsRef.current['dubbed'] && selectedAudioTracks.includes('dubbed') && dubbedAudioBuffer) {
        audioElementsRef.current['dubbed'].muted = true;
      }
    }, [dubbedAudioBuffer, selectedAudioTracks]);

    // Add timeupdate listener to check for tracks only in advanced edit mode
    useEffect(() => {      
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        checkAndPlayTracks();
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        if (trackAudioContextRef.current) {
          trackAudioContextRef.current.close();
          trackAudioContextRef.current = null;
        }
      };
    }, [tracks]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleSeeked = () => {
        if (trackSourceNodeRef.current) {
          trackSourceNodeRef.current.stop();
          trackSourceNodeRef.current.disconnect();
        }
        checkAndPlayTracks();
      };

      video.addEventListener('seeked', handleSeeked);
      
      return () => {
        video.removeEventListener('seeked', handleSeeked);
      };
    }, [tracks]);

    const playTrackBuffer = (track: Track) => {
      if (!track.buffer) return;

      try {
        if (!trackAudioContextRef.current) {
          trackAudioContextRef.current = new AudioContext();
        }

        // Stop any currently playing track
        if (trackSourceNodeRef.current) {
          try {
            trackSourceNodeRef.current.stop();
            trackSourceNodeRef.current.disconnect();
          } catch (error) {
            console.error("Error stopping previous track:", error);
          }
        }

        // Create new source and gain nodes
        const source = trackAudioContextRef.current.createBufferSource();
        const gainNode = trackAudioContextRef.current.createGain();
        
        source.buffer = track.buffer;
        gainNode.gain.value = Math.pow(10, track.volume_gain_db / 20); // Convert dB to linear gain
        
        source.connect(gainNode);
        gainNode.connect(trackAudioContextRef.current.destination);
        
        // Calculate offset within the buffer
        const bufferOffset = Math.max(0, videoRef.current!.currentTime - track.start);
        const duration = track.end - track.start;
        
        source.start(0, bufferOffset, duration);
        
        trackSourceNodeRef.current = source;
        gainNodeRef.current = gainNode;

        // Stop the source when the track ends
        setTimeout(() => {
          try {
            source.stop();
            source.disconnect();
          } catch (error) {
            console.error("Error stopping track:", error);
          } finally {
            // Always ensure dubbed vocals are unmuted when track ends
            if (audioElementsRef.current['dubbed'] && selectedAudioTracks.includes('dubbed')) {
              audioElementsRef.current['dubbed'].muted = false;
            }
          }
        }, (duration - bufferOffset) * 1000);

      } catch (error) {
        console.error("Error playing track buffer:", error);
        // Ensure dubbed vocals are unmuted if there's an error
        if (audioElementsRef.current['dubbed'] && selectedAudioTracks.includes('dubbed')) {
          audioElementsRef.current['dubbed'].muted = false;
        }
      }
    };

    const checkAndPlayTracks = () => {
      if (!videoRef.current || advancedEditMode) return;
      
      const currentTime = videoRef.current.currentTime;
      
      try {
        const activeTrack = tracks.find(track => 
          currentTime >= track.start && 
          currentTime <= track.end
        );

        const activeBufferTrack = tracks.find(track => 
          track.buffer && 
          !track.deleted && 
          currentTime >= track.start - 1 && 
          currentTime <= track.end
        );

        if (activeTrack?.deleted || activeBufferTrack) {
          if (audioElementsRef.current['dubbed']) {
            audioElementsRef.current['dubbed'].muted = true;
          }
          
          if (activeBufferTrack) {
            playTrackBuffer(activeBufferTrack);
          }
        } else {
          if (audioElementsRef.current['dubbed']) {
            audioElementsRef.current['dubbed'].muted = false;
          }
          if (trackSourceNodeRef.current) {
            try {
              trackSourceNodeRef.current.stop();
              trackSourceNodeRef.current.disconnect();
            } catch (error) {
              console.error("Error stopping track:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error checking and playing tracks:", error);
        if (audioElementsRef.current['dubbed']) {
          audioElementsRef.current['dubbed'].muted = false;
        }
      }
    };

    return (
      <MediaContainer>
        <StyledVideo 
          ref={videoRef} 
          controls 
          preload="auto" 
          isEditMode={tracks.length > 0}
        >
          <source src={src} type={mediaType} />
          {originalSubtitlesUrl && (
            <track 
              ref={originalTrackRef} 
              kind="captions" 
              srcLang="original" 
              label="Original" 
            />
          )}
          {dubbedSubtitlesUrl && (
            <track 
              ref={dubbedTrackRef} 
              kind="captions" 
              srcLang="dubbed" 
              label="Dubbed" 
            />
          )}
          Your browser does not support the video tag.
        </StyledVideo>
      </MediaContainer>
    );
  }
);

export default VideoPlayer;
