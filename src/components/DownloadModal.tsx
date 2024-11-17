import React, { useCallback, useState } from 'react';
import styled, { keyframes }  from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button, Label, ModalOverlay, colors, Title, ErrorMessage, Message, ErrorBox } from '../styles/designSystem';
import { AudioTrack } from '../types/AudioTrack';

const ModalContent = styled.div`
  background-color: ${colors.background};
  padding: 20px;
  border-radius: 5px;
  max-width: 500px;
  width: 100%;
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

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  border: 4px solid ${colors.background};
  border-top: 4px solid ${colors.primary};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
`;

const Center = styled.div`
  text-align: center;
`;

interface DownloadModalProps {
  audioTracks: { [key: string]: AudioTrack };
  subtitles: string[];
  onClose: () => void;
  onDownload: (selectedAudioTracks: string[], selectedSubtitles: string[]) => Promise<void>;
  onRegenerate?: () => void;
  progressMessage?: string;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ 
  audioTracks, 
  subtitles, 
  onClose, 
  onDownload, 
  onRegenerate,
  progressMessage,
}) => {
  const { t } = useTranslation();
  const [selectedAudioTracks, setSelectedAudioTracks] = useState<string[]>(['dubbed']);
  const [selectedSubtitles, setSelectedSubtitles] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      await onDownload(
        selectedAudioTracks, 
        selectedSubtitles
      );
      onClose();
    } catch (error) {
      console.error('Error downloading video:', error);
      setError(`${error}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRegenerateClick = () => {
    if (onRegenerate) {
      onRegenerate();
      onClose();
    }
  };

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (error) {
    return (
      <ModalOverlay>
        <ModalContent>
          <Title>{t('downloadError')}</Title>
          <ErrorMessage>{t('downloadErrorMessage')}</ErrorMessage>
          <ErrorBox>{error}</ErrorBox>
          <ButtonContainer>
            <Button onClick={onClose}>{t('cancel')}</Button>
            {onRegenerate && (
              <Button onClick={handleRegenerateClick}>{t('regenerate')}</Button>
            )}
          </ButtonContainer>
        </ModalContent>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <Title>{!isDownloading ? t('selectTracksForDownload') : t('preparingDownload')}</Title>
        {!isDownloading ? (
          <>
            <TrackList>
              <h3>{t('audioTracks')}</h3>
          {Object.entries(audioTracks).filter(([id]) => id !== 'background').map(([id, track], index) => (
            <TrackItem key={index}>
              <Checkbox
                type="checkbox"
                checked={selectedAudioTracks.includes(id)}
                onChange={() => handleAudioTrackToggle(id)}
                disabled={isDownloading}
              />
              <Label htmlFor={id}>{track.label}</Label>
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
                disabled={isDownloading}
              />
              <Label htmlFor={subtitle}>{t(`${subtitle}Subtitles`)}</Label>
            </TrackItem>
              ))}
            </TrackList>
            <ButtonContainer>
              <Button 
                onClick={onClose} 
              >
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleDownload} 
              >
                {t('downloadResult')}
              </Button>
            </ButtonContainer>
          </>
        ) : (
          <LoadingContainer>
            <Spinner />
            <Center>
              <Message>{progressMessage || t('downloading')}</Message>
            </Center>
          </LoadingContainer>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default DownloadModal;
