import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Track } from '../types/Track';
import { Button, colors, typography } from '../styles/designSystem';

const ListContainer = styled.div`
  background-color: ${colors.background};
  padding: 10px;
  overflow-y: auto;
`;

const TrackRow = styled.div`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid ${colors.border};
`;

const TrackTime = styled.span`
  width: 100px;
  font-size: ${typography.fontSize.small};
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  color: ${colors.text};
  &:hover {
    background-color: ${colors.timeline};
  }
`;

const TrackTextContainer = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
`;

const TrackTextArea = styled.textarea`
  flex-grow: 1;
  border: none;
  background: transparent;
  font-size: ${typography.fontSize.medium};
  resize: none;
  overflow: hidden;
  padding: 5px;
  font-family: ${typography.fontFamily};
  line-height: 1.5;
  min-height: 1.5em;
  color: ${colors.text};
`;

const EditIcon = styled(Button)`
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  color: ${colors.primary};
  background-color: transparent;
  &:hover {
    background-color: ${colors.desactivatLight};
  }
`;

interface TrackListProps {
  tracks: Track[];
  onTrackChange: (index: number, updatedTrack: Track) => void;
  onTimeChange: (time: number) => void;
  onEditTrack: (track: Track) => void;
}

const TrackList: React.FC<TrackListProps> = ({ tracks, onTrackChange, onTimeChange, onEditTrack }) => {
  const handleTimeClick = (time: number) => {
    onTimeChange(time);
  };

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, textarea.clientHeight)}px`;
  };

  const handleTextareaChange = (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTrackChange(index, { ...tracks[index], text: e.target.value });
    adjustTextareaHeight(e.target);
  };

  useEffect(() => {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('.track-textarea');
    textareas.forEach(adjustTextareaHeight);
  }, [tracks]);

  return (
    <ListContainer>
      {tracks.map((track, index) => (
        <TrackRow key={track.id}>
          <TrackTime onClick={() => handleTimeClick(track.start)}>
            {formatTime(track.start)}
          </TrackTime>
          <TrackTextContainer>
            <TrackTextArea
              className="track-textarea"
              value={track.text}
              onChange={(e) => handleTextareaChange(index, e)}
              onFocus={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
            />
            <EditIcon onClick={() => onEditTrack(track)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
              </svg>
            </EditIcon>
          </TrackTextContainer>
        </TrackRow>
      ))}
    </ListContainer>
  );
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default TrackList;
