import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Subtitle } from '../services/FFmpegService';

const ListContainer = styled.div`
  background-color: #ffd8a8;
  padding: 10px;
  overflow-y: auto;
`;

const SubtitleRow = styled.div`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #ccc;
`;

const SubtitleTime = styled.span`
  width: 100px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const SubtitleTextArea = styled.textarea`
  flex-grow: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  resize: none;
  overflow: hidden;
  padding: 5px;
  font-family: inherit;
  line-height: 1.5;
  min-height: 1.5em;
  display: flex;
  align-items: center;
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

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, textarea.clientHeight)}px`;
  };

  const handleTextareaChange = (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSubtitleChange(index, { ...subtitles[index], text: e.target.value });
    adjustTextareaHeight(e.target);
  };

  useEffect(() => {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('.subtitle-textarea');
    textareas.forEach(adjustTextareaHeight);
  }, [subtitles]);

  return (
    <ListContainer>
      {subtitles.map((subtitle, index) => (
        <SubtitleRow key={index}>
          <SubtitleTime onClick={() => handleTimeClick(subtitle.startTime)}>
            {formatTime(subtitle.startTime)}
          </SubtitleTime>
          <SubtitleTextArea
            className="subtitle-textarea"
            value={subtitle.text}
            onChange={(e) => handleTextareaChange(index, e)}
            onFocus={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
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
