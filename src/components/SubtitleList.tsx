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

const SubtitleTextContainer = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
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
`;

const EditIcon = styled.span`
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

interface SubtitleListProps {
  subtitles: Subtitle[];
  onSubtitleChange: (index: number, updatedSubtitle: Subtitle) => void;
  onTimeChange: (time: number) => void;
  onEditSubtitle: (subtitle: Subtitle) => void;
}

const SubtitleList: React.FC<SubtitleListProps> = ({ subtitles, onSubtitleChange, onTimeChange, onEditSubtitle }) => {
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
        <SubtitleRow key={subtitle.id}>
          <SubtitleTime onClick={() => handleTimeClick(subtitle.startTime)}>
            {formatTime(subtitle.startTime)}
          </SubtitleTime>
          <SubtitleTextContainer>
            <SubtitleTextArea
              className="subtitle-textarea"
              value={subtitle.text}
              onChange={(e) => handleTextareaChange(index, e)}
              onFocus={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
            />
            <EditIcon onClick={() => onEditSubtitle(subtitle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
              </svg>
            </EditIcon>
          </SubtitleTextContainer>
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
