import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Track } from '../types/Track';
import { Button, Input, ModalContent, TextArea, Select, Label, colors } from '../styles/designSystem';
import { useTranslation } from 'react-i18next';
import { speakerService, Speaker } from '../services/SpeakerService';

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

const DeleteButton = styled(Button)`
  background-color: ${colors.tertiary};
  &:hover {
    background-color: ${colors.tertiaryLight};
  }
`;

const RightButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const UndoButton = styled(Button)`
  padding: 5px;
  display: flex;
  align-items: center;
  color: ${colors.primary};
  background-color: transparent;
  &:hover {
    background-color: ${colors.desactivatLight};
  }
`;

const TextContainer = styled.div`
  position: relative;
`;

const UndoContainer = styled.div`
  position: absolute;
  right: 5px;
  top: 5px;
`;

interface TrackEditModalProps {
  track: Track | null;
  onSave: (updatedTrack: Track, needsReconstruction: boolean) => void;
  onClose: () => void;
  ModalOverlay: React.ComponentType<any>;
  isDubbingService: boolean;
}

const TrackEditModal: React.FC<TrackEditModalProps> = ({ 
  track, 
  onSave, 
  onClose, 
  ModalOverlay, 
  isDubbingService,
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  useEffect(() => {
    if (track) {
      setText(track.text);
      setTranslatedText(track.translated_text || '');
      setStartTime(track.start);
      setEndTime(track.end);
      setSpeed(track.speed || 1);
      setSelectedSpeakerId(track.speaker_id || '');
    }
    setSpeakers(speakerService.getSpeakers());
  }, [track]);

  const handleSave = () => {
    if (track) {

      const newSpeaker = speakerService.getSpeakerById(selectedSpeakerId);
      const oldSpeaker = speakerService.getSpeakerById(track.speaker_id);

      const updatedTrack = {
        ...track,
        text,
        translated_text: translatedText,
        start: startTime,
        end: endTime,
        speed: speed,
        speaker_id: selectedSpeakerId,
        needsResynthesis: translatedText !== track.translated_text || newSpeaker.voice !== oldSpeaker.voice
      };

      const needsReconstruction = 
        startTime !== track.start ||
        speed !== track.speed ||
        updatedTrack.needsResynthesis;

      onSave(updatedTrack, needsReconstruction);
    }
    onClose();
  };

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!track) return null;

  const handleDelete = () => {
    if (track) {
      const updatedTrack = { ...track, deleted: true };
      onSave(updatedTrack, true);
    }
    onClose();
  };

  const handleUndoText = () => {
    if (track?.original_text) {
      setText(track.original_text);
    }
  };

  const handleUndoTranslation = () => {
    if (track?.original_translated_text) {
      setTranslatedText(track.original_translated_text);
    }
  };

  const hasTextChanges = text !== track?.original_text;
  const hasTranslationChanges = translatedText !== track?.original_translated_text;

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        {isDubbingService && (
          <>
            <Label>{t('originalText')}</Label>
            <TextContainer>
              <TextArea value={text} onChange={(e) => setText(e.target.value)} readOnly />
            </TextContainer>
            <Label>{t('translatedText')}</Label>
            <TextContainer>
              <TextArea 
                value={translatedText} 
                onChange={(e) => setTranslatedText(e.target.value)} 
              />
              {hasTranslationChanges && (
                <UndoContainer>
                  <UndoButton onClick={handleUndoTranslation} title={t('undo')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill="currentColor"/>
                    </svg>
                  </UndoButton>
                </UndoContainer>
              )}
            </TextContainer>
          </>
        )}
        {!isDubbingService && (
          <>
            <Label>{t('text')}</Label>
            <TextContainer>
              <TextArea 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
              />
              {hasTextChanges && (
                <UndoContainer>
                  <UndoButton onClick={handleUndoText} title={t('undo')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill="currentColor"/>
                    </svg>
                  </UndoButton>
                </UndoContainer>
              )}
            </TextContainer>
          </>
        )}
        <Label>{t('startTime')}</Label>
        <Input
          type="number"
          value={startTime}
          onChange={(e) => setStartTime(Number(e.target.value))}
          step="0.1"
        />
        <Label>{t('endTime')}</Label>
        <Input
          type="number"
          value={endTime}
          onChange={(e) => setEndTime(Number(e.target.value))}
          step="0.1"
        />
        <Label>{t('speed')}</Label>
        <Input
          type="number"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          step="0.1"
          min="1"
          max="2"
        />
        <Label>{t('speaker')}</Label>
        <Select
          value={selectedSpeakerId}
          onChange={(e) => setSelectedSpeakerId(e.target.value)}
        >
          <option value="">{t('selectSpeaker')}</option>
          {speakers.map(speaker => (
            <option key={speaker.id} value={speaker.id}>
              {speaker.name} ({speaker.voice.label})
            </option>
          ))}
        </Select>
        <ButtonContainer>
          <DeleteButton onClick={handleDelete}>{t('deleteTrack')}</DeleteButton>
          <RightButtons>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </RightButtons>
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TrackEditModal;
