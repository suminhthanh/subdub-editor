import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { Rnd } from 'react-rnd';
import { Subtitle } from '../services/FFmpegService';
import { colors, typography } from '../styles/designSystem';

const SubtitleBox = styled.div`
  background-color: ${colors.quaternaryLight};
  color: ${colors.black};
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
  font-size: ${typography.fontSize.medium};
`;

interface SubtitleItemProps {
  subtitle: Subtitle;
  onChange: (updatedSubtitle: Subtitle) => void;
  zoomLevel: number;
  onEdit: (subtitle: Subtitle) => void;
}

const SubtitleItem: React.FC<SubtitleItemProps> = ({ subtitle, onChange, zoomLevel, onEdit }) => {
  const [isDragging, setIsDragging] = useState(false);
  const interactionStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleInteractionStart = (clientX: number, clientY: number) => {
    interactionStartPosRef.current = { x: clientX, y: clientY };
  };

  const handleInteractionEnd = (clientX: number, clientY: number) => {
    if (interactionStartPosRef.current) {
      const dx = Math.abs(clientX - interactionStartPosRef.current.x);
      const dy = Math.abs(clientY - interactionStartPosRef.current.y);
      
      if (dx < 5 && dy < 5 && !isDragging) {
        onEdit(subtitle);
      }
    }
    interactionStartPosRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleInteractionStart(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    handleInteractionEnd(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleInteractionStart(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    handleInteractionEnd(touch.clientX, touch.clientY);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = (e: any, d: { x: number, y: number }) => {
    const newStartTime = Math.max(0, d.x / zoomLevel);
    onChange({ ...subtitle, startTime: newStartTime });
    setIsDragging(false);
  };

  const handleResize = (e: any, direction: string, ref: any, delta: { width: number }) => {
    const newDuration = Number(Math.max(0.1, subtitle.duration + delta.width / zoomLevel).toFixed(3));
    onChange({ ...subtitle, duration: newDuration });
  };

  return (
    <Rnd
      position={{ x: subtitle.startTime * zoomLevel, y: 0 }}
      size={{ width: subtitle.duration * zoomLevel, height: 30 }}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStop={handleResize}
      dragAxis="x"
      bounds="parent"
      enableResizing={{ right: true }}
      minWidth={10}
    >
      <SubtitleBox
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {subtitle.text}
      </SubtitleBox>
    </Rnd>
  );
};

export default SubtitleItem;
