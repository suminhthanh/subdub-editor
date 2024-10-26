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
import { synthesisService } from './services/SynthesisService';
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

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 30vh;
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

function App() {
  const { t, i18n } = useTranslation();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'list' | 'options'>('timeline');
  const [mediaType, setMediaType] = useState<string>('');
  const [mediaFileName, setMediaFileName] = useState<string>('');
  const mediaRef = useRef<MediaPlayerRef | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isUUIDMode, setIsUUIDMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serviceParam, setServiceParam] = useState<string>('dubbing');
  const [isLoading, setIsLoading] = useState(false);
  const initialLoadRef = useRef(false);
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

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const uuidParam = params.get('uuid');
    const serviceParam = params.get('service') as 'dubbing' | 'transcription' | null;

    console.log("Initial useEffect - UUID param:", uuidParam, "Service param:", serviceParam);

    if (appMode) {
      // Environment variable is set, use it to determine the mode
      if (appMode === 'dubbing' || appMode === 'transcription') {
        if (uuidParam) {
          setIsUUIDMode(true);
          setServiceParam(appMode);
          handleFileOrUUIDSelect(null, uuidParam);
        } else {
          setLoadError('missingUUID');
        }
      } else if (appMode === 'file') {
        setIsUUIDMode(false);
        // Ignore UUID if present in file mode
      }
    } else {
      // No environment variable set, use dynamic behavior
      if (uuidParam) {
        setIsUUIDMode(true);
        setServiceParam(serviceParam || 'dubbing');
        handleFileOrUUIDSelect(null, uuidParam);
      } else {
        setIsUUIDMode(false);
      }
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
          const [silentVideoResponse, originalAudioBuffer, backgroundAudioBuffer, dubbedVocalsBuffer, tracksDataResponse] = await Promise.all([
            DubbingAPIService.loadSilentVideoFromUUID(newUuid),
            DubbingAPIService.loadOriginalVocalsFromUUID(newUuid),
            DubbingAPIService.loadBackgroundAudioFromUUID(newUuid),
            DubbingAPIService.loadDubbedVocalsFromUUID(newUuid),
            DubbingAPIService.loadTracksFromUUID(newUuid)
          ]);

          const parsedTracks = DubbingAPIService.parseTracksFromJSON(tracksDataResponse);
          
          setMediaUrl(silentVideoResponse.url);
          setMediaType('video/mp4');
          setAudioTracks({
            background: { buffer: backgroundAudioBuffer, label: t('backgroundAudio') },
            original: { buffer: originalAudioBuffer, label: t('originalVocals') },
            dubbed: { buffer: dubbedVocalsBuffer, label: t('dubbedVocals') },
          });
          setTracks(parsedTracks);

          // Load dubbed audio chunks in the background
          loadChunksInBackground(newUuid, parsedTracks);
        } else if (serviceParam === "transcription") {
          const [videoDataResponse, tracksDataResponse] = await Promise.all([
            TranscriptionAPIService.loadVideoFromUUID(newUuid),
            TranscriptionAPIService.loadTracksFromUUID(newUuid)
          ]);

          setMediaUrl(videoDataResponse.url);
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
  }, [mediaUrl, serviceParam]);

  const loadChunksInBackground = useCallback(async (uuid: string, tracks: Track[]) => {
    const dubbedTracks = tracks.filter(track => track.dubbed_path && track.for_dubbing);
    const totalChunks = dubbedTracks.length;
    let loadedChunks = 0;

    const newChunkBuffers: { [key: string]: ArrayBuffer } = {};

    for (const track of dubbedTracks) {
      const chunkName = track.dubbed_path.split("/").pop();
      if (chunkName) {
        try {
          const buffer = await DubbingAPIService.loadSingleChunk(uuid, chunkName);
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
        console.log("Recreating constructed audio...");
        const result = await audioService.recreateConstructedAudio(updatedTracks, chunkBuffers);
        console.log("Audio reconstruction complete. Updating audio tracks...");
        setAudioTracks(prevTracks => ({
          ...prevTracks,
          dubbed: { ...prevTracks.dubbed, buffer: result },
        }));
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

  const handleDeleteTrack = useCallback((trackId: string) => {
    setTracks(prevTracks => {
      const newTracks = prevTracks.filter(t => t.id !== trackId);
      recreateConstructedAudio(newTracks);
      return newTracks;
    });
  }, [recreateConstructedAudio]);

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
        let fileToProcess: File;
        if (mediaFile) {
          fileToProcess = mediaFile;
        } else {
          const response = await fetch(mediaUrl);
          const blob = await response.blob();
          fileToProcess = new File([blob], `dubbed_final.mp4`, { type: mediaType });
        }

        const backgroundAudio = audioTracks.background;
        const selectedAudioBuffers: { buffer: AudioBuffer, label: string }[] = [];

        // Decode background audio once
        const backgroundBuffer = backgroundAudio.buffer instanceof AudioBuffer 
          ? backgroundAudio.buffer 
          : await audioService.decodeAudioData(backgroundAudio.buffer.slice(0));

        for (const selectedAudioTrack of selectedAudioTracks) {
          const audioTrack = audioTracks[selectedAudioTrack];
          if (audioTrack) {
            // Create a fresh copy of the buffer for each iteration
            const audioBuffer = audioTrack.buffer instanceof AudioBuffer
              ? audioTrack.buffer
              : await audioService.decodeAudioData(audioTrack.buffer.slice(0));

            const finalAudioBuffer = await audioService.mixAudioBuffers(
              backgroundBuffer,
              audioBuffer
            );
            selectedAudioBuffers.push({ buffer: finalAudioBuffer, label: selectedAudioTrack });
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

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <Header>
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
                {!isUUIDMode && (
                  <Button onClick={handleCloseMedia}>{t('closeMedia')}</Button>
                )}
                <Button onClick={handleDownloadClick}>{t('downloadResult')}</Button>
              </>
            )}
            <Select onChange={changeLanguage} value={i18n.language} style={{ margin: 0 }}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="ca">Català</option>
            </Select>
          </HeaderRight>
        </Header>
        <ContentContainer>
          {isLoading ? (
            <CenteredMessage>{t('loading')}</CenteredMessage>
          ) : mediaUrl ? (
            <>
              <VideoContainer>
                <MediaPlayer 
                  src={mediaUrl} 
                  tracks={tracks} 
                  ref={mediaRef} 
                  mediaType={mediaType} 
                  audioTracks={audioTracks}
                  selectedAudioTracks={selectedAudioTracks}
                  selectedSubtitles={selectedSubtitles}
                />
              </VideoContainer>
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
            </>
          ) : loadError ? (
            <CenteredMessage>{t(loadError)}</CenteredMessage>
          ) : (!appMode || appMode === 'file') && !isUUIDMode ? (
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
