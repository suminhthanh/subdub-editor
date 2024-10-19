import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useTranslation } from 'react-i18next';
import VideoPlayer from './components/VideoPlayer';
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'list'>('timeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uuid, setUuid] = useState<string | null>(null);
  const videoRef = useRef<{
    currentTime: number;
    setCurrentTime: (time: number) => void;
    play: () => void;
    pause: () => void;
  } | null>(null);

  const handleFileSelect = async (file: File) => {
    setVideoFile(file);
    try {
      const url = URL.createObjectURL(file);
      console.debug("Created video URL:", url);
      setVideoUrl(url);
      const extractedSubtitles = await extractSubtitles(file);
      setSubtitles(extractedSubtitles);
    } catch (error) {
      console.error("Error processing video file:", error);
    }
  };

  const handleDownloadResult = async () => {
    if (videoUrl && subtitles.length > 0) {
      try {
        let fileToProcess: File;
        if (videoFile) {
          fileToProcess = videoFile;
        } else {
          // If we don't have a videoFile (in case of UUID), we need to fetch it
          const response = await fetch(videoUrl);
          const blob = await response.blob();
          fileToProcess = new File([blob], "video.mp4", { type: "video/mp4" });
        }
        const newVideoBlob = await rebuildSubtitles(fileToProcess, subtitles);
        const url = URL.createObjectURL(newVideoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video_with_subtitles.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading result:", error);
      }
    }
  };

  const handleCloseVideo = () => {
    setVideoFile(null);
    setVideoUrl('');
    setSubtitles([]);
    setUuid(null);
    setCurrentTime(0);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.setCurrentTime(0);
    }
  };

  const handleTimeChange = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.setCurrentTime(newTime);
    }
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space' && event.target === document.body) {
      event.preventDefault();
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          videoRef.current.play();
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
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
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
    if (file) {
      setUuid(null);
      setVideoFile(file);
      try {
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        const extractedSubtitles = await extractSubtitles(file);
        setSubtitles(extractedSubtitles);
      } catch (error) {
        console.error("Error processing video file:", error);
      }
    } else if (newUuid) {
      setVideoFile(null);
      setUuid(newUuid);
      try {
        const videoUrl = await loadVideoFromUUID(newUuid);
        setVideoUrl(videoUrl);
        const subtitlesJSON = await loadSubtitlesFromUUID(newUuid);
        const parsedSubtitles = parseSubtitlesFromJSON(subtitlesJSON);
        setSubtitles(parsedSubtitles);
      } catch (error) {
        console.error("Error loading video or subtitles from UUID:", error);
      }
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <Header>
          {videoUrl ? (
            <>
              <Button onClick={handleCloseVideo}>{t('closeVideo')}</Button>
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
          {videoUrl && (
            <VideoContainer>
              <VideoPlayer src={videoUrl} subtitles={subtitles} ref={videoRef} />
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
