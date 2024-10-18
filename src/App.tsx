import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import VideoPlayer from './components/VideoPlayer';
import SubtitleTimeline from './components/SubtitleTimeline';
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

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const videoRef = useRef<{ currentTime: number } | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      const extractedSubtitles = await extractSubtitles(file);
      setSubtitles(extractedSubtitles);
    }
  };

  const handleRebuildSubtitles = async () => {
    if (videoFile && subtitles.length > 0) {
      const newVideoBlob = await rebuildSubtitles(videoFile, subtitles);
      setVideoUrl(URL.createObjectURL(newVideoBlob));
    }
  };

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
      {videoUrl && <VideoPlayer src={videoUrl} subtitles={subtitles} ref={videoRef} />}
      {subtitles.length > 0 && (
        <>
          <SubtitleTimeline
            subtitles={subtitles}
            setSubtitles={setSubtitles}
            currentTime={currentTime}
          />
          <Button onClick={handleRebuildSubtitles}>Rebuild Subtitles</Button>
        </>
      )}
    </AppContainer>
  );
}

export default App;
