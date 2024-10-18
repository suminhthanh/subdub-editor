import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Rnd } from 'react-rnd';
import { Subtitle } from '../services/FFmpegService';

const SubtitleBox = styled.div`
  background-color: #ff9f43;
  border-radius: 5px;
  padding: 5px;
  cursor: move;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 30px;
  display: flex;
  align-items: center;
`;

const SubtitleText = styled.input`
  width: 100%;
  border: none;
  background: transparent;
  font-size: 14px;
`;

interface SubtitleItemProps {
  subtitle: Subtitle;
  onChange: (updatedSubtitle: Subtitle) => void;
  zoomLevel: number;
}

const SubtitleItem: React.FC<SubtitleItemProps> = ({ subtitle, onChange, zoomLevel }) => {
  const [text, setText] = useState(subtitle.text);

  const handleDragStop = useCallback((e: any, d: { x: number, y: number }) => {
    const newStartTime = Math.max(0, d.x / zoomLevel);
    onChange({ ...subtitle, startTime: newStartTime });
  }, [subtitle, onChange, zoomLevel]);

  const handleResize = useCallback((e: any, direction: string, ref: any, delta: { width: number }) => {
    const newDuration = Math.max(0.1, subtitle.duration + delta.width / zoomLevel);
    onChange({ ...subtitle, duration: newDuration });
  }, [subtitle, onChange, zoomLevel]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    onChange({ ...subtitle, text: e.target.value });
  }, [onChange, subtitle]);

  return (
    <Rnd
      position={{ x: subtitle.startTime * zoomLevel, y: 0 }}
      size={{ width: subtitle.duration * zoomLevel, height: 30 }}
      onDragStop={handleDragStop}
      onResizeStop={handleResize}
      dragAxis="x"
      bounds="parent"
      enableResizing={{ right: true }}
      minWidth={10}
    >
      <SubtitleBox>
        <SubtitleText
          value={text}
          onChange={handleTextChange}
          onBlur={() => onChange({ ...subtitle, text })}
        />
      </SubtitleBox>
    </Rnd>
  );
};

export default SubtitleItem;
