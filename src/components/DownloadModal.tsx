import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button, ModalOverlay, colors } from '../styles/designSystem';

const ModalContent = styled.div`
  background-color: ${colors.background};
  padding: 20px;
  border-radius: 5px;
  max-width: 500px;
  width: 100%;
`;

const Title = styled.h2`
  color: ${colors.primary};
  margin-bottom: 20px;
`;

const TrackList = styled.div`
  margin-bottom: 20px;
`;

const TrackItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const Checkbox = styled.input`
  margin-right: 10px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

interface DownloadModalProps {
  audioTracks: { buffer: ArrayBuffer | AudioBuffer; label: string }[];
  subtitles: string[];
  onClose: () => void;
  onDownload: (selectedAudioTracks: number[], selectedSubtitles: string[]) => void;
  isRebuilding: boolean;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ audioTracks, subtitles, onClose, onDownload, isRebuilding }) => {
  const { t } = useTranslation();
  const [selectedAudioTracks, setSelectedAudioTracks] = useState<number[]>([]);
  const [selectedSubtitles, setSelectedSubtitles] = useState<string[]>([]);

  const handleAudioTrackToggle = (index: number) => {
    setSelectedAudioTracks(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSubtitleToggle = (subtitle: string) => {
    setSelectedSubtitles(prev =>
      prev.includes(subtitle) ? prev.filter(s => s !== subtitle) : [...prev, subtitle]
    );
  };

  const handleDownload = () => {
    onDownload(selectedAudioTracks, selectedSubtitles);
    onClose();
  };

  return (
    <ModalOverlay>
      <ModalContent>
        <Title>{t('selectTracksForDownload')}</Title>
        <TrackList>
          <h3>{t('audioTracks')}</h3>
          {audioTracks.map((track, index) => (
            <TrackItem key={index}>
              <Checkbox
                type="checkbox"
                checked={selectedAudioTracks.includes(index)}
                onChange={() => handleAudioTrackToggle(index)}
                disabled={isRebuilding}
              />
              <span>{track.label}</span>
            </TrackItem>
          ))}
        </TrackList>
        <TrackList>
          <h3>{t('subtitles')}</h3>
          {subtitles.map((subtitle) => (
            <TrackItem key={subtitle}>
              <Checkbox
                type="checkbox"
                checked={selectedSubtitles.includes(subtitle)}
                onChange={() => handleSubtitleToggle(subtitle)}
                disabled={isRebuilding}
              />
              <span>{subtitle}</span>
            </TrackItem>
          ))}
        </TrackList>
        <ButtonContainer>
          <Button onClick={onClose} disabled={isRebuilding}>{t('cancel')}</Button>
          <Button onClick={handleDownload} disabled={isRebuilding}>{t('download')}</Button>
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DownloadModal;
