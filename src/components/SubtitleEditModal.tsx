import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Subtitle } from '../services/FFmpegService';

const ModalContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 300px;
`;

const Input = styled.input`
  width: 100%;
  margin-bottom: 10px;
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 100px;
  margin-bottom: 10px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

const Button = styled.button`
  padding: 5px 10px;
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

  if (!subtitle) return null;

  return (
    <ModalOverlay>
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
