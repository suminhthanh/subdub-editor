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

interface TrackEditModalProps {
  track: Track | null;
  onSave: (updatedTrack: Track, needsReconstruction: boolean) => void;
  onClose: () => void;
  onDelete: (trackId: string) => void;
  ModalOverlay: React.ComponentType<any>;
  isDubbingService: boolean;
}

const TrackEditModal: React.FC<TrackEditModalProps> = ({ 
  track, 
  onSave, 
  onClose, 
  onDelete, 
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
      const updatedTrack = {
        ...track,
        text,
        translated_text: translatedText,
        start: startTime,
        end: endTime,
        speed: speed,
        speaker_id: selectedSpeakerId,
        needsResynthesis: translatedText !== track.translated_text || selectedSpeakerId !== track.speaker_id
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
      onDelete(track.id);
    }
    onClose();
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        {isDubbingService && (
          <>
            <Label>{t('originalText')}</Label>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} readOnly />
            <Label>{t('translatedText')}</Label>
            <TextArea value={translatedText} onChange={(e) => setTranslatedText(e.target.value)} />
          </>
        )}
        {!isDubbingService && (
          <>
            <Label>{t('text')}</Label>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} />
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
              {speaker.name}
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
