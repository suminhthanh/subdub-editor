import React from 'react';
import styled from 'styled-components';
import { Subtitle } from '../services/FFmpegService';

const ListContainer = styled.div`
  background-color: #ffd8a8;
  padding: 20px;
  border-radius: 5px;
  height: 400px;
  overflow-y: auto;
`;

const SubtitleRow = styled.div`
  display: flex;
  align-items: center;
  padding: 5px;
  border-bottom: 1px solid #ccc;
`;

const SubtitleTime = styled.span`
  width: 100px;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

const SubtitleText = styled.input`
  flex-grow: 1;
  border: none;
  background: transparent;
  font-size: 14px;
`;

interface SubtitleListProps {
  subtitles: Subtitle[];
  onSubtitleChange: (index: number, updatedSubtitle: Subtitle) => void;
  onTimeChange: (time: number) => void;
}

const SubtitleList: React.FC<SubtitleListProps> = ({ subtitles, onSubtitleChange, onTimeChange }) => {
  const handleTimeClick = (time: number) => {
    onTimeChange(time);
  };

  return (
    <ListContainer>
      {subtitles.map((subtitle, index) => (
        <SubtitleRow key={index}>
          <SubtitleTime onClick={() => handleTimeClick(subtitle.startTime)}>
            {formatTime(subtitle.startTime)}
          </SubtitleTime>
          <SubtitleText
            value={subtitle.text}
            onChange={(e) => onSubtitleChange(index, { ...subtitle, text: e.target.value })}
          />
        </SubtitleRow>
      ))}
    </ListContainer>
  );
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default SubtitleList;
