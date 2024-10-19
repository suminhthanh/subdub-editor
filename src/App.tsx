import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useTranslation } from 'react-i18next';
import MediaPlayer, { MediaPlayerRef } from './components/MediaPlayer';
import SubtitleTimeline from './components/SubtitleTimeline';
import SubtitleList from './components/SubtitleList';
import { extractSubtitles, rebuildSubtitles, Subtitle } from './services/FFmpegService';
import FileSelectionModal from './components/FileSelectionModal';
import { loadVideoFromUUID, loadSubtitlesFromUUID, parseSubtitlesFromJSON } from './services/APIService';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
  }
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 5px;
  font-family: Arial, sans-serif;
  background-color: #fff5e6;
  color: #4a4a4a;
  box-sizing: border-box;
`;

const Header = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
`;

const LanguageSelect = styled.select`
  padding: 5px;
  font-size: 14px;
`;

const Button = styled.button`
  background-color: #ff6b6b;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 5px;

  &:hover {
    background-color: #ff8787;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #ff6b6b;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 10px;
  background-color: ${props => props.active ? '#ff6b6b' : '#ffd8a8'};
  color: ${props => props.active ? 'white' : 'black'};
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${props => props.active ? '#ff8787' : '#ffcb9a'};
  }
`;

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 30vh;
  margin-bottom: 20px;
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const SubtitleContainer = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const TabContent = styled.div`
  flex: 1;
  overflow: hidden;
`;

const CenteredButton = styled(Button)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

function App() {
  const { t, i18n } = useTranslation();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'list'>('timeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uuid, setUuid] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('');
  const [mediaFileName, setMediaFileName] = useState<string>('');
  const mediaRef = useRef<MediaPlayerRef | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uuidParam = params.get('uuid');
    if (uuidParam) {
      handleFileOrUUIDSelect(null, uuidParam);
    }
  }, []);  // Empty dependency array ensures this runs only once on component mount

  const handleFileSelect = async (file: File) => {
    setMediaFile(file);
    setMediaType(file.type);
    setMediaFileName(file.name);
    try {
      const url = URL.createObjectURL(file);
      console.debug("Created media URL:", url);
      setMediaUrl(url);
      const extractedSubtitles = await extractSubtitles(file);
      setSubtitles(extractedSubtitles);
    } catch (error) {
      console.error("Error processing media file:", error);
    }
  };

  const handleDownloadResult = async () => {
    if (mediaUrl && subtitles.length > 0) {
      try {
        let fileToProcess: File;
        if (mediaFile) {
          fileToProcess = mediaFile;
        } else {
          // If we don't have a mediaFile (in case of UUID), we need to fetch it
          const response = await fetch(mediaUrl);
          const blob = await response.blob();
          fileToProcess = new File([blob], mediaFileName, { type: mediaType });
        }
        const newMediaBlob = await rebuildSubtitles(fileToProcess, subtitles);
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
      }
    }
  };

  const handleCloseMedia = () => {
    setMediaFile(null);
    setMediaUrl('');
    setSubtitles([]); // Ensure subtitles are cleared
    setUuid(null);
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

  const handleSubtitleChange = (index: number, updatedSubtitle: Subtitle) => {
    const newSubtitles = [...subtitles];
    newSubtitles[index] = updatedSubtitle;
    setSubtitles(newSubtitles);
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

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

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFileOrUUIDSelect = async (file: File | null, newUuid: string | null) => {
    // Revoke existing object URL if there is one
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }

    // Clear existing subtitles before loading new media
    setSubtitles([]);

    if (file) {
      setUuid(null);
      setMediaFile(file);
      setMediaType(file.type);
      setMediaFileName(file.name);
      try {
        const url = URL.createObjectURL(file);
        setMediaUrl(url);
        const extractedSubtitles = await extractSubtitles(file);
        setSubtitles(extractedSubtitles);
      } catch (error) {
        console.error("Error processing media file:", error);
        setSubtitles([]);
      }
    } else if (newUuid) {
      setMediaFile(null);
      setUuid(newUuid);
      try {
        const { url, contentType, filename } = await loadVideoFromUUID(newUuid);
        setMediaUrl(url);
        setMediaType(contentType);
        setMediaFileName(filename);
        const subtitlesJSON = await loadSubtitlesFromUUID(newUuid);
        const parsedSubtitles = parseSubtitlesFromJSON(subtitlesJSON);
        setSubtitles(parsedSubtitles);
      } catch (error) {
        console.error("Error loading media or subtitles from UUID:", error);
        setSubtitles([]);
      }
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <Header>
          {mediaUrl ? (
            <>
              <Button onClick={handleCloseMedia}>{t('closeMedia')}</Button>
              <Button onClick={handleDownloadResult}>{t('downloadResult')}</Button>
            </>
          ) : (
            <CenteredButton onClick={handleOpenModal}>{t('openFile')}</CenteredButton>
          )}
          <LanguageSelect onChange={changeLanguage} value={i18n.language}>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="ca">Català</option>
          </LanguageSelect>
        </Header>
        <ContentContainer>
          {mediaUrl && (
            <VideoContainer>
              <MediaPlayer src={mediaUrl} subtitles={subtitles} ref={mediaRef} mediaType={mediaType} />
            </VideoContainer>
          )}
          <SubtitleContainer>
            {subtitles.length > 0 && (
              <>
                <TabContainer>
                  <Tab active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')}>{t('timeline')}</Tab>
                  <Tab active={activeTab === 'list'} onClick={() => setActiveTab('list')}>{t('list')}</Tab>
                </TabContainer>
                {activeTab === 'timeline' ? (
                  <SubtitleTimeline
                    subtitles={subtitles}
                    setSubtitles={setSubtitles}
                    currentTime={currentTime}
                    onTimeChange={handleTimeChange}
                  />
                ) : (
                  <SubtitleList
                    subtitles={subtitles}
                    onSubtitleChange={handleSubtitleChange}
                    onTimeChange={handleTimeChange}
                  />
                )}
              </>
            )}
          </SubtitleContainer>
        </ContentContainer>
      </AppContainer>
      <FileSelectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFileOrUUIDSelect}
      />
    </>
  );
}

export default App;
