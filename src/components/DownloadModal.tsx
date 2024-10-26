import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button, ModalOverlay, colors } from '../styles/designSystem';
import { AudioTrack } from '../types/AudioTrack';

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
  audioTracks: { [key: string]: AudioTrack };
  subtitles: string[];
  onClose: () => void;
  onDownload: (selectedAudioTracks: string[], selectedSubtitles: string[]) => void;
  isRebuilding: boolean;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ audioTracks, subtitles, onClose, onDownload, isRebuilding }) => {
  const { t } = useTranslation();
  const [selectedAudioTracks, setSelectedAudioTracks] = useState<string[]>([]);
  const [selectedSubtitles, setSelectedSubtitles] = useState<string[]>([]);

  const handleAudioTrackToggle = (id: string) => {
    setSelectedAudioTracks(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
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
          {Object.entries(audioTracks).filter(([id, track]) => id !== 'background').map(([id, track], index) => (
            <TrackItem key={index}>
              <Checkbox
                type="checkbox"
                checked={selectedAudioTracks.includes(id)}
                onChange={() => handleAudioTrackToggle(id)}
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
