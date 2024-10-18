import React, { useState } from 'react';
import styled from 'styled-components';
import Draggable from 'react-draggable';
import { Subtitle } from '../services/FFmpegService';

const SubtitleBox = styled.div`
  position: absolute;
  background-color: #ff9f43;
  border-radius: 5px;
  padding: 5px;
  cursor: move;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
}

const SubtitleItem: React.FC<SubtitleItemProps> = ({ subtitle, onChange }) => {
  const [text, setText] = useState(subtitle.text);

  const handleDrag = (e: any, data: { x: number }) => {
    const newStartTime = subtitle.startTime + data.x / 10;
    onChange({ ...subtitle, startTime: newStartTime });
  };

  const handleResize = (e: any, direction: string, ref: any, delta: { width: number }) => {
    const newDuration = subtitle.duration + delta.width / 10;
    onChange({ ...subtitle, duration: newDuration });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    onChange({ ...subtitle, text: e.target.value });
  };

  return (
    <Draggable
      axis="x"
      bounds="parent"
      onDrag={handleDrag}
      position={{ x: subtitle.startTime * 10, y: 0 }}
    >
      <SubtitleBox style={{ width: `${subtitle.duration * 10}px` }}>
        <SubtitleText
          value={text}
          onChange={handleTextChange}
          onBlur={() => onChange({ ...subtitle, text })}
        />
      </SubtitleBox>
    </Draggable>
  );
};

export default SubtitleItem;
