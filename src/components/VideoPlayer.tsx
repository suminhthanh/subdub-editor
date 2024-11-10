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
  width: ${props => props.isEditMode ? '100%' : 'auto'};
`;

const VideoPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(
  ({ src, tracks, mediaType, audioTracks, selectedAudioTracks, selectedSubtitles, advancedEditMode }, ref) => {
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
          Object.values(audioElementsRef.current).forEach(audio => {
            audio.currentTime = time;
          });
        }
      },
      play() {
        if (videoRef.current) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              Object.values(audioElementsRef.current).forEach(audio => {
                const audioPlayPromise = audio.play();
                if (audioPlayPromise !== undefined) {
                  audioPlayPromise.catch(error => {
                    console.log("Audio play prevented:", error);
                  });
                }
              });
            }).catch(error => {
              console.log("Video play prevented:", error);
            });
          }
        }
      },
      pause() {
        videoRef.current?.pause();
        Object.values(audioElementsRef.current).forEach(audio => {
          audio.pause();
        });
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

      // Play selected tracks that have buffers
      selectedAudioTracks.forEach((trackId) => {
        const track = audioTracks[trackId];
        if (track?.buffer instanceof AudioBuffer) {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = track.buffer;
          source.connect(audioContextRef.current!.destination);
          source.start(0, startTime);
          audioBufferSourcesRef.current.push(source);
        }
      });
    };

    // Update audio elements when tracks change
    useEffect(() => {
      // Clear existing audio elements
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause();
      });
      audioElementsRef.current = {};

      // Create new audio elements for tracks with URLs
      Object.entries(audioTracks).forEach(([id, track]) => {
        if (track.url && !track.buffer) {
          const audio = new Audio(track.url);
          audio.preload = 'auto';
          audio.muted = !selectedAudioTracks.includes(id);
          
          // Sync initial time with video if it exists
          if (videoRef.current) {
            audio.currentTime = videoRef.current.currentTime;
          }
          
          // Start playing if video is playing
          if (videoRef.current && !videoRef.current.paused) {
            audio.play().catch(error => {
              console.log("Audio play prevented:", error);
            });
          }
          
          audioElementsRef.current[id] = audio;
        }
      });

      return () => {
        Object.values(audioElementsRef.current).forEach(audio => {
          audio.pause();
        });
        audioElementsRef.current = {};
      };
    }, [audioTracks]);

    // Handle selected tracks changes
    useEffect(() => {
      // Update HTML audio elements
      Object.entries(audioElementsRef.current).forEach(([id, audio]) => {
        audio.muted = !selectedAudioTracks.includes(id);
      });

      // Update buffer-based tracks if video is playing
      if (videoRef.current && !videoRef.current.paused) {
        playBufferTracks(videoRef.current.currentTime);
      }
    }, [selectedAudioTracks]);

    // Sync video and audio playback
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => {
        // Play HTML audio elements
        Object.values(audioElementsRef.current).forEach(audio => {
          audio.play().catch(error => {
            console.log("Audio play prevented:", error);
          });
        });

        // Play buffer-based tracks
        playBufferTracks(video.currentTime);
        video.play();
      };

      const handlePause = () => {
        // Pause HTML audio elements
        Object.values(audioElementsRef.current).forEach(audio => {
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
        video.pause();
      };

      const handleSeeked = () => {
        const currentTime = video.currentTime;
        // Update HTML audio elements
        Object.values(audioElementsRef.current).forEach(audio => {
          audio.currentTime = currentTime;
        });
        // Restart buffer-based tracks
        if (!video.paused) {
          playBufferTracks(currentTime);
        }

        video.play();
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('seeked', handleSeeked);

      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('seeked', handleSeeked);
        
        // Cleanup audio context and sources
        audioBufferSourcesRef.current.forEach(source => {
          try {
            source.stop();
            source.disconnect();
          } catch (error) {
            console.error("Error cleaning up audio source:", error);
          }
        });
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
    }, [audioTracks, selectedAudioTracks]);

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
    }, [tracks, advancedEditMode]);

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
    }, [tracks, advancedEditMode]);

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
      if (!videoRef.current) return;
      
      const currentTime = videoRef.current.currentTime;
      
      try {
        // Find any track (including deleted ones) that should be active at current time
        const activeTrack = tracks.find(track => 
          currentTime >= track.start && 
          currentTime <= track.end
        );

        // Find any track with a buffer that should be playing at current time
        const activeBufferTrack = tracks.find(track => 
          track.buffer && // Only consider tracks with buffers (synthesized)
          !track.deleted && // Not deleted
          currentTime >= track.start - 1 && 
          currentTime <= track.end
        );

        if (activeTrack?.deleted) {
          // If there's a deleted track at this time, mute dubbed vocals if selected
          if (audioElementsRef.current['dubbed'] && selectedAudioTracks.includes('dubbed')) {
            audioElementsRef.current['dubbed'].muted = true;
          }
        } else if (activeBufferTrack) {
          // If there's a synthesized track, mute dubbed vocals and play the buffer
          if (audioElementsRef.current['dubbed'] && selectedAudioTracks.includes('dubbed')) {
            audioElementsRef.current['dubbed'].muted = true;
          }
          playTrackBuffer(activeBufferTrack);
        } else {
          // If no active track or the active track is neither deleted nor synthesized
          // ensure dubbed vocals are unmuted if selected
          if (audioElementsRef.current['dubbed'] && selectedAudioTracks.includes('dubbed')) {
            audioElementsRef.current['dubbed'].muted = false;
          }
          // Stop any playing synthesized track
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
        // Ensure dubbed vocals are unmuted if there's an error
        if (audioElementsRef.current['dubbed'] && selectedAudioTracks.includes('dubbed')) {
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
