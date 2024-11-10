import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useTranslation } from 'react-i18next';
import MediaPlayer, { MediaPlayerRef } from './components/MediaPlayer';
import TrackTimeline from './components/TrackTimeline';
import TrackList from './components/TrackList';
import { extractTracks, rebuildMedia } from './services/FFmpegService';
import TrackEditModal from './components/TrackEditModal';
import { Button, Select, colors, typography, ModalOverlay } from './styles/designSystem';
import { Input } from './styles/designSystem';
import { Track } from './types/Track';
import { TranscriptionAPIService } from './services/TranscriptionAPIService';
import { DubbingAPIService } from './services/DubbingAPIService';
import { audioService } from './services/AudioService';
import VideoOptions from './components/VideoOptions';
import DownloadModal from './components/DownloadModal';
import LoadingOverlay from './components/LoadingOverlay';
import { speakerService } from './services/SpeakerService';
import { Voice } from './types/Voice';
import { AudioTrack } from './types/AudioTrack';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: ${typography.fontFamily};
    background-color: ${colors.secondaryBackground};
    color: ${colors.black};
  }
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
  background-color: ${colors.background};
`;

const Header = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 5px;
  gap: 10px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ProgressMessage = styled.div`
  font-size: 14px;
  color: ${colors.primary};
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #ff6b6b;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 10px;
  background-color: ${props => props.active ? colors.primary : colors.desactivat};
  color: ${props => props.active ? colors.white : colors.black};
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${props => props.active ? colors.primaryLight : colors.desactivatLight};
  }
`;

const VideoContainer = styled.div<{ isEditMode: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: ${props => props.isEditMode ? '30vh' : 'none'};
  width: 100%;
  margin: 0px;
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const TrackContainer = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const CenteredMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-size: 1.2em;
  color: ${colors.primary};
`;

const CenteredContent = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const loadDubbingMediaInBackground = async (uuid: string) => {
  try {
    const [
      originalAudioBuffer,
      backgroundAudioBuffer,
      dubbedVocalsBuffer,
    ] = await Promise.all([
      DubbingAPIService.loadOriginalVocalsFromUUID(uuid),
      DubbingAPIService.loadBackgroundAudioFromUUID(uuid),
      DubbingAPIService.loadDubbedVocalsFromUUID(uuid),
    ]);

    return {
      videoUrl: DubbingAPIService.getSilentVideoUrl(uuid),
      originalAudioBuffer,
      backgroundAudioBuffer,
      dubbedVocalsBuffer,
    };
  } catch (error) {
    throw error;
  }
};

function App() {
  const { t, i18n } = useTranslation();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'list' | 'options'>('list');
  const [mediaType, setMediaType] = useState<string>('');
  const [mediaFileName, setMediaFileName] = useState<string>('');
  const mediaRef = useRef<MediaPlayerRef | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [advancedEditMode, setAdvancedEditMode] = useState(false);
  const [uuidParam, setUuidParam] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serviceParam, setServiceParam] = useState<string>('dubbing');
  const [isLoading, setIsLoading] = useState(false);
  const [audioTracks, setAudioTracks] = useState<{ [key: string]: AudioTrack }>({});
  const [chunkBuffers, setChunkBuffers] = useState<{ [key: string]: ArrayBuffer }>({});
  const [selectedAudioTracks, setSelectedAudioTracks] = useState<string[]>(['background', 'dubbed']); // Default to first two tracks
  const [selectedSubtitles, setSelectedSubtitles] = useState<string>('none');
  const [showSpeakerColors, setShowSpeakerColors] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [appMode, setAppMode] = useState<'dubbing' | 'transcription' | 'file' | null>(
    process.env.APP_MODE as 'dubbing' | 'transcription' | 'file' | null
  );
  const [chunkLoadingProgress, setChunkLoadingProgress] = useState(0);
  const [reconstructionMessage, setReconstructionMessage] = useState<string | null>(null);
  const [isMediaFullyLoaded, setIsMediaFullyLoaded] = useState(false);
  const [backgroundLoadingMessage, setBackgroundLoadingMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uuidParam = params.get('uuid');
    const serviceParam = params.get('service') as 'dubbing' | 'transcription' | null;
    if (serviceParam) {
      setAppMode(serviceParam);
    } else {
      setServiceParam(appMode || 'dubbing');
    }

    console.log("Initial useEffect - UUID param:", uuidParam, "Service param:", serviceParam, "App mode:", appMode);

    if (uuidParam) {
      setUuidParam(uuidParam);
      handleFileOrUUIDSelect(null, uuidParam);
    }
  }, [appMode]);

  const handleCloseMedia = () => {
    setMediaFile(null);
    setMediaUrl('');
    setTracks([]); // Ensure tracks are cleared
    setCurrentTime(0);
    setIsPlaying(false);
    setMediaType('');
    setMediaFileName('');
    if (mediaRef.current) {
      mediaRef.current.setCurrentTime(0);
    }
    // Revoke the object URL to free up memory
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }
  };

  const handleTimeChange = (newTime: number) => {
    if (mediaRef.current) {
      mediaRef.current.setCurrentTime(newTime);
    }
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space' && event.target === document.body) {
      event.preventDefault();
      if (mediaRef.current) {
        if (isPlaying) {
          mediaRef.current.pause();
          setIsPlaying(false);
        } else {
          mediaRef.current.play();
          setIsPlaying(true);
        }
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress, isPlaying]);

  useEffect(() => {
    const updateCurrentTime = () => {
      if (mediaRef.current) {
        setCurrentTime(mediaRef.current.currentTime);
      }
    };

    const interval = setInterval(updateCurrentTime, 100);

    return () => clearInterval(interval);
  }, []);

  const changeLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value);
  };

  const handleFileOrUUIDSelect = useCallback(async (file: File | null, newUuid: string | null) => {
    console.log("handleFileOrUUIDSelect called with UUID:", newUuid);
    
    // Revoke existing object URL if there is one
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }

    // Clear existing tracks and errors before loading new media
    setTracks([]);
    setLoadError(null);
    setIsLoading(true);

    if (newUuid) {
      setMediaFile(null);
      try {
        console.log("Starting API calls for UUID:", newUuid);

        if (serviceParam === "dubbing") {
          // First verify UUID exists
          await DubbingAPIService.uuidExists(newUuid);
          
          // Set initial video URL
          setMediaUrl(DubbingAPIService.getMediaUrl(newUuid));
          setMediaType('video/mp4');
        } else if (serviceParam === "transcription") {
          const [videoDataResponse, tracksDataResponse] = await Promise.all([
            TranscriptionAPIService.getMediaMetadata(newUuid),
            TranscriptionAPIService.loadTracksFromUUID(newUuid)
          ]);

          setMediaUrl(TranscriptionAPIService.getMediaUrl(newUuid));
          setMediaType(videoDataResponse.contentType);
          setMediaFileName(videoDataResponse.filename);
          setTracks(TranscriptionAPIService.parseTracksFromJSON(tracksDataResponse));
        }
      } catch (error) {
        console.error("Error loading media or tracks from UUID:", error);
        setLoadError('errorLoadingUUID');
      }
    } else if (file) {
      setMediaFile(file);
      setMediaType(file.type);
      setMediaFileName(file.name);
      try {
        const url = URL.createObjectURL(file);
        setMediaUrl(url);
        const extractedTracks = await extractTracks(file);
        setTracks(extractedTracks);
      } catch (error) {
        console.error("Error processing media file:", error);
        setTracks([]);
      }
    }
    setIsLoading(false);
  }, [serviceParam]);

  const loadChunksInBackground = useCallback(async (uuid: string, tracks: Track[]) => {
    const dubbedTracks = tracks.filter(track => track.dubbed_path && track.for_dubbing);
    const totalChunks = dubbedTracks.length;
    let loadedChunks = 0;

    const newChunkBuffers: { [key: string]: ArrayBuffer } = {};

    for (const track of dubbedTracks) {
      const chunkName = track.dubbed_path.split("/").pop();
      if (chunkName) {
        try {
          const buffer = await DubbingAPIService.loadDubbedUtterance(uuid, track.id);
          newChunkBuffers[chunkName] = buffer;
          loadedChunks++;
          setChunkLoadingProgress((loadedChunks / totalChunks) * 100);
        } catch (error) {
          console.error(`Failed to load chunk: ${chunkName}`, error);
        }
      }
    }

    setChunkBuffers(newChunkBuffers);
    const constructedDubbedAudioBuffer = await audioService.recreateConstructedAudio(tracks, newChunkBuffers);
    setAudioTracks(prevTracks => ({
      ...prevTracks,
      dubbed: { ...prevTracks.dubbed, buffer: constructedDubbedAudioBuffer },
    }));
  }, []);

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track);
  };

  const recreateConstructedAudio = useCallback(async (updatedTracks: Track[]) => {
    if (serviceParam === "dubbing") {
      try {
        setReconstructionMessage(t('reconstructingAudio'));
        if (advancedEditMode) {
          console.log("Recreating constructed audio...");
          const result = await audioService.recreateConstructedAudio(updatedTracks, chunkBuffers);
          console.log("Audio reconstruction complete. Updating audio tracks...");
          setAudioTracks(prevTracks => ({
            ...prevTracks,
            dubbed: { ...prevTracks.dubbed, label: t('dubbedVocals'), buffer: result },
          }));
        } else {
          for (const track of updatedTracks) {
            if (track.needsResynthesis) {
              const resynthesizedBuffer = await audioService.resynthesizeTrack(track);
              track.buffer = await audioService.decodeAudioData(resynthesizedBuffer);
              track.needsResynthesis = false;
            }
          }
          setTracks(updatedTracks)
        }
      } catch (error) {
        console.error("Error recreating constructed audio:", error);
      } finally {
        setReconstructionMessage(null);
      }
    }
  }, [serviceParam, chunkBuffers, t]);

  const handleSaveTrack = useCallback(async (updatedTrack: Track, needsReconstruction: boolean) => {
    console.log("handleSaveTrack called with updatedTrack:", updatedTrack, "needsReconstruction:", needsReconstruction);
    if (editingTrack) {
      setTracks(prevTracks => {
        const newTracks = prevTracks.map(t => 
          t.id === editingTrack.id ? updatedTrack : t
        );
        if (needsReconstruction) {
          recreateConstructedAudio(newTracks);
        }
        return newTracks;
      });
      setEditingTrack(null);
    }
  }, [editingTrack, recreateConstructedAudio]);

  const handleTrackChange = useCallback((index: number, updatedTrack: Track, recreateAudio: boolean = false) => {
    console.log(`Track ${index} changed:`, updatedTrack);
    setTracks(prevTracks => {
      const newTracks = [...prevTracks];
      newTracks[index] = updatedTrack;
      if (recreateAudio) {
        console.log("Track changed, calling recreateConstructedAudio...");
        recreateConstructedAudio(newTracks);
      }
      return newTracks;
    });
  }, [recreateConstructedAudio]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      handleFileOrUUIDSelect(selectedFile, null);
    }
  };

  const handleAudioTrackToggle = (id: string) => {
    setSelectedAudioTracks(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteTrack = useCallback((trackId: number) => {
    setTracks(prevTracks => {
      const newTracks = prevTracks.map(t => 
        t.id === trackId ? { ...t, deleted: true } : t
      );
      return newTracks;
    });
  }, []);

  const handleSubtitlesChange = (subtitles: string) => {
    setSelectedSubtitles(subtitles);
  };

  const handleShowSpeakerColorsChange = (show: boolean) => {
    setShowSpeakerColors(show);
  };

  const isDubbingService = serviceParam === 'dubbing';

  const handleDownloadClick = () => {
    setShowDownloadModal(true);
  };

  const handleDownloadModalClose = () => {
    setShowDownloadModal(false);
  };

  const handleDownloadWithSelectedTracks = async (selectedAudioTracks: string[], selectedSubtitles: string[]) => {
    if (mediaUrl && tracks.length > 0) {
      try {
        setIsRebuilding(true);
        let fileToProcess: File | string = mediaFile || mediaUrl;

        const backgroundAudio = audioTracks.background;
        const selectedAudioBuffers: { buffer: AudioBuffer, label: string }[] = [];

        // Decode background audio once
        const backgroundBuffer = backgroundAudio.buffer;

        for (const selectedAudioTrack of selectedAudioTracks) {
          const audioTrack = audioTracks[selectedAudioTrack];
          if (audioTrack) {
            // Create a fresh copy of the buffer for each iteration
            const audioBuffer = audioTrack.buffer;

            if (audioBuffer && backgroundBuffer) {
              const finalAudioBuffer = await audioService.mixAudioBuffers(
                backgroundBuffer,
                audioBuffer
              );
              selectedAudioBuffers.push({ buffer: finalAudioBuffer, label: selectedAudioTrack });
            }
          } else {
            throw new Error(`Audio track ${selectedAudioTrack} not found`);
          }
        }
        console.log("selectedAudioBuffers", selectedAudioBuffers);

        const newMediaBlob = await rebuildMedia(fileToProcess, tracks, selectedAudioBuffers, selectedSubtitles);
        const url = URL.createObjectURL(newMediaBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `output_${mediaFileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading result:", error);
      } finally {
        setIsRebuilding(false);
        setShowDownloadModal(false);
      }
    }
  };

  const handleSpeakerVoiceChange = useCallback(async (speakerId: string, newVoice: Voice) => {
    setReconstructionMessage(t('reconstructingAudio'));
    try {
      // Update the speaker's voice in the SpeakerService
      await speakerService.updateSpeaker(speakerId, { voice: newVoice });

      // Update tracks associated with this speaker
      const updatedTracks = tracks.map(track => {
        if (track.speaker_id === speakerId) {
          // Set needsResynthesis flag to true for affected tracks
          return { ...track, needsResynthesis: true };
        }
        return track;
      });

      setTracks(updatedTracks);

      // Recreate constructed audio
      await recreateConstructedAudio(updatedTracks);
    } catch (error) {
      console.error("Error updating speaker voice:", error);
      // You might want to show an error message to the user here
    } finally {
      setReconstructionMessage(null);
    }
  }, [tracks, recreateConstructedAudio]);

  useEffect(() => {
    const forcedLanguage = process.env.APP_LANGUAGE;
    if (forcedLanguage) {
      i18n.changeLanguage(forcedLanguage);
    }
  }, [i18n]);

  const handleEditModeToggle = async () => {
    setIsMediaFullyLoaded(false);
    setBackgroundLoadingMessage(t('loadingMedia'));
    try {
      if (uuidParam) {
        const rawTracks = await DubbingAPIService.loadTracksFromUUID(uuidParam);
        const parsedTracks = DubbingAPIService.parseTracksFromJSON(rawTracks);
        setTracks(parsedTracks);

        setMediaUrl(DubbingAPIService.getSilentVideoUrl(uuidParam));
        setAudioTracks({
          background: { 
            url: DubbingAPIService.getBackgroundAudioUrl(uuidParam), 
            label: t('backgroundAudio') 
          },
          original: { 
            url: DubbingAPIService.getOriginalVocalsUrl(uuidParam), 
            label: t('originalVocals') 
          },
          dubbed: { 
            url: DubbingAPIService.getDubbedVocalsUrl(uuidParam), 
            label: t('dubbedVocals') 
          },
        });
        
        setIsMediaFullyLoaded(true);
      }
    } catch (error) {
      console.error("Error loading edit mode:", error);
      setLoadError('errorLoadingUUID');
    } finally {
      setBackgroundLoadingMessage(null);
      setIsEditMode(true);
    }
  };

  const handleSimpleDownload = () => {
    const params = new URLSearchParams(window.location.search);
    const uuid = params.get('uuid');
    if (uuid) {
      const url = DubbingAPIService.getMediaUrl(uuid);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dubbed_video.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <Header>
          {backgroundLoadingMessage && (
            <ProgressMessage>
              {backgroundLoadingMessage}
            </ProgressMessage>
          )}
          {(chunkLoadingProgress > 0 && chunkLoadingProgress < 100) && (
            <ProgressMessage>
              {t('loadingChunks')}: {chunkLoadingProgress.toFixed(0)}%
            </ProgressMessage>
          )}
          {reconstructionMessage && (
            <ProgressMessage>{reconstructionMessage}</ProgressMessage>
          )}
          <HeaderRight>
            {mediaUrl && (
              <>
                {!uuidParam && (
                  <Button onClick={handleCloseMedia}>{t('closeMedia')}</Button>
                )}
                {isDubbingService && (
                  <>
                    {!isEditMode && (
                      <Button onClick={handleEditModeToggle}>
                        {t('edit')}
                      </Button>
                    )}
                    <Button 
                      onClick={isEditMode ? handleDownloadClick : handleSimpleDownload}
                      disabled={isEditMode && !isMediaFullyLoaded}
                    >
                      {t('downloadResult')}
                    </Button>
                  </>
                )}
                {!isDubbingService && (
                  <Button onClick={handleDownloadClick}>
                    {t('downloadResult')}
                  </Button>
                )}
              </>
            )}
            {!process.env.APP_LANGUAGE && (
              <Select onChange={changeLanguage} value={i18n.language} style={{ margin: 0 }}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ca">Català</option>
              </Select>
            )}
          </HeaderRight>
        </Header>
        <ContentContainer>
          {isLoading ? (
            <CenteredMessage>{t('loading')}</CenteredMessage>
          ) : mediaUrl ? (
            <>
              <VideoContainer isEditMode={isEditMode}>
                <MediaPlayer 
                  src={mediaUrl} 
                  tracks={isEditMode ? tracks : []} 
                  ref={mediaRef} 
                  mediaType={mediaType} 
                  audioTracks={audioTracks}
                  selectedAudioTracks={selectedAudioTracks}
                  selectedSubtitles={selectedSubtitles}
                />
              </VideoContainer>
              {isEditMode && (
                <TrackContainer>
                  {tracks.length > 0 && (
                    <>
                      <TabContainer>
                        <Tab active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')}>{t('timeline')}</Tab>
                        <Tab active={activeTab === 'list'} onClick={() => setActiveTab('list')}>{t('list')}</Tab>
                        <Tab active={activeTab === 'options'} onClick={() => setActiveTab('options')}>{t('options')}</Tab>
                      </TabContainer>
                      {activeTab === 'timeline' ? (
                        <TrackTimeline
                          tracks={tracks}
                          setTracks={setTracks}
                          currentTime={currentTime}
                          onTimeChange={handleTimeChange}
                          onEditTrack={handleEditTrack}
                          isDubbingService={isDubbingService}
                          onTrackChange={handleTrackChange}
                          showSpeakerColors={showSpeakerColors}
                        />
                      ) : activeTab === 'list' ? (
                        <TrackList
                          tracks={tracks}
                          onTrackChange={handleTrackChange}
                          onTimeChange={handleTimeChange}
                          onEditTrack={handleEditTrack}
                          onDeleteTrack={handleDeleteTrack}
                          isDubbingService={isDubbingService}
                          showSpeakerColors={showSpeakerColors}
                        />
                      ) : (
                        <VideoOptions
                          audioTracks={audioTracks}
                          selectedTracks={selectedAudioTracks}
                          onAudioTrackToggle={handleAudioTrackToggle}
                          selectedSubtitles={selectedSubtitles}
                          onSubtitlesChange={handleSubtitlesChange}
                          showSpeakerColors={showSpeakerColors}
                          onShowSpeakerColorsChange={handleShowSpeakerColorsChange}
                          tracks={tracks}
                          onTracksChange={setTracks}
                          onSpeakerVoiceChange={handleSpeakerVoiceChange}
                        />
                      )}
                    </>
                  )}
                </TrackContainer>
              )}
            </>
          ) : loadError ? (
            <CenteredMessage>{t(loadError)}</CenteredMessage>
          ) : (!appMode || appMode === 'file') && !uuidParam ? (
            <CenteredContent>
              <Input type="file" onChange={handleFileChange} />
              <Button onClick={handleSubmit} disabled={!selectedFile}>{t('openFile')}</Button>
            </CenteredContent>
          ) : null}
        </ContentContainer>
      </AppContainer>
      <TrackEditModal
        track={editingTrack}
        onSave={handleSaveTrack}
        onClose={() => setEditingTrack(null)}
        onDelete={handleDeleteTrack}
        ModalOverlay={ModalOverlay}
        isDubbingService={isDubbingService}
      />
      {showDownloadModal && (
        <DownloadModal
          audioTracks={audioTracks}
          subtitles={['original', 'dubbed']}
          onClose={handleDownloadModalClose}
          onDownload={handleDownloadWithSelectedTracks}
          isRebuilding={isRebuilding}
        />
      )}
      {isRebuilding && <LoadingOverlay message={t('rebuildingMedia')} />}
    </>
  );
}

export default App;
