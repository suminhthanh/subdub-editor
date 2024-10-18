import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import VideoPlayer from './components/VideoPlayer';
import SubtitleTimeline from './components/SubtitleTimeline';
import SubtitleList from './components/SubtitleList';
import { extractSubtitles, rebuildSubtitles, Subtitle } from './services/FFmpegService';

const AppContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  background-color: #fff5e6;
  color: #4a4a4a;
`;

const Title = styled.h1`
  color: #ff6b6b;
  text-align: center;
`;

const Button = styled.button`
  background-color: #ff6b6b;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  margin: 10px 0;
  border-radius: 5px;

  &:hover {
    background-color: #ff8787;
  }
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
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

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'list'>('timeline');
  const videoRef = useRef<{
    currentTime: number;
    setCurrentTime: (time: number) => void;
    play: () => void;
    pause: () => void;
  } | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.debug("File selected:", file.name);
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
    }
  };

  const handleDownloadResult = async () => {
    if (videoFile && subtitles.length > 0) {
      try {
        const newVideoBlob = await rebuildSubtitles(videoFile, subtitles);
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

  return (
    <AppContainer>
      <Title>Video Subtitle Editor</Title>
      <input type="file" accept="video/*" onChange={handleFileSelect} />
      {videoUrl && (
        <VideoPlayer src={videoUrl} subtitles={subtitles} ref={videoRef} />
      )}
      {subtitles.length > 0 && (
        <>
          <TabContainer>
            <Tab active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')}>Timeline</Tab>
            <Tab active={activeTab === 'list'} onClick={() => setActiveTab('list')}>List</Tab>
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
          <Button onClick={handleDownloadResult}>Download Result</Button>
        </>
      )}
    </AppContainer>
  );
}

export default App;
