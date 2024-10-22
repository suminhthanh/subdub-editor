import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Subtitle } from '../services/FFmpegService';
import { colors, typography, Button, Input, ModalContent, TextArea } from '../styles/designSystem';



const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

interface SubtitleEditModalProps {
  subtitle: Subtitle | null;
  onSave: (updatedSubtitle: Subtitle) => void;
  onClose: () => void;
  ModalOverlay: React.ComponentType<any>;
}

const SubtitleEditModal: React.FC<SubtitleEditModalProps> = ({ subtitle, onSave, onClose, ModalOverlay }) => {
  const [text, setText] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  useEffect(() => {
    if (subtitle) {
      setText(subtitle.text);
      setStartTime(subtitle.startTime);
      setEndTime(subtitle.startTime + subtitle.duration);
    }
  }, [subtitle]);

  const handleSave = () => {
    if (subtitle) {
      onSave({
        ...subtitle,
        text,
        startTime,
        duration: endTime - startTime
      });
    }
    onClose();
  };

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!subtitle) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <TextArea value={text} onChange={(e) => setText(e.target.value)} />
        <Input
          type="number"
          value={startTime}
          onChange={(e) => setStartTime(Number(e.target.value))}
          step="0.1"
        />
        <Input
          type="number"
          value={endTime}
          onChange={(e) => setEndTime(Number(e.target.value))}
          step="0.1"
        />
        <ButtonContainer>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SubtitleEditModal;
