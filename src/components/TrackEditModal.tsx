import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Track } from '../types/Track';
import { Button, Input, ModalContent, TextArea } from '../styles/designSystem';
import { useTranslation } from 'react-i18next';

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

interface TrackEditModalProps {
  track: Track | null;
  onSave: (updatedTrack: Track) => void;
  onClose: () => void;
  ModalOverlay: React.ComponentType<any>;
  isDubbingService: boolean; // Add this prop
}

const TrackEditModal: React.FC<TrackEditModalProps> = ({ track, onSave, onClose, ModalOverlay, isDubbingService }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  useEffect(() => {
    if (track) {
      setText(track.text);
      setTranslatedText(track.translated_text || '');
      setStartTime(track.start);
      setEndTime(track.end);
    }
  }, [track]);

  const handleSave = () => {
    if (track) {
      onSave({
        ...track,
        text,
        translated_text: translatedText,
        start: startTime,
        end: endTime
      });
    }
    onClose();
  };

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!track) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        {isDubbingService && (
          <>
            <label>{t('originalText')}</label>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} readOnly />
            <label>{t('translatedText')}</label>
            <TextArea value={translatedText} onChange={(e) => setTranslatedText(e.target.value)} />
          </>
        )}
        {!isDubbingService && (
          <>
            <label>{t('text')}</label>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} />
          </>
        )}
        <label>{t('startTime')}</label>
        <Input
          type="number"
          value={startTime}
          onChange={(e) => setStartTime(Number(e.target.value))}
          step="0.1"
        />
        <label>{t('endTime')}</label>
        <Input
          type="number"
          value={endTime}
          onChange={(e) => setEndTime(Number(e.target.value))}
          step="0.1"
        />
        <ButtonContainer>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave}>{t('save')}</Button>
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TrackEditModal;
