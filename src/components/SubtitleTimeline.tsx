import React from 'react';
import styled from 'styled-components';
import SubtitleItem from './SubtitleItem';
import { Subtitle } from '../services/FFmpegService';

const TimelineContainer = styled.div`
  background-color: #ffd8a8;
  padding: 20px;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const Timeline = styled.div`
  position: relative;
  height: 400px;
  overflow-y: auto;
`;

const CurrentTimeIndicator = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #ff6b6b;
  z-index: 10;
`;

interface SubtitleTimelineProps {
  subtitles: Subtitle[];
  setSubtitles: React.Dispatch<React.SetStateAction<Subtitle[]>>;
  currentTime: number;
}

const SubtitleTimeline: React.FC<SubtitleTimelineProps> = ({ subtitles, setSubtitles, currentTime }) => {
  const handleSubtitleChange = (index: number, updatedSubtitle: Subtitle) => {
    const newSubtitles = [...subtitles];
    newSubtitles[index] = updatedSubtitle;
    setSubtitles(newSubtitles);
  };

  return (
    <TimelineContainer>
      <h2>Subtitle Timeline</h2>
      <Timeline>
        <CurrentTimeIndicator style={{ left: `${currentTime * 10}px` }} />
        {subtitles.map((subtitle, index) => (
          <SubtitleItem
            key={index}
            subtitle={subtitle}
            onChange={(updatedSubtitle) => handleSubtitleChange(index, updatedSubtitle)}
          />
        ))}
      </Timeline>
    </TimelineContainer>
  );
};

export default SubtitleTimeline;
