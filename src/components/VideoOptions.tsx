import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { colors } from '../styles/designSystem';

const OptionsContainer = styled.div`
  padding: 20px;
  background-color: ${colors.background};
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const Checkbox = styled.input`
  margin-right: 10px;
`;

const Label = styled.label`
  font-size: 14px;
  color: ${colors.text};
`;

const RadioContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

const RadioButton = styled.input`
  margin-right: 10px;
`;

interface VideoOptionsProps {
  audioTracks: { buffer: ArrayBuffer | AudioBuffer; label: string }[];
  selectedTracks: number[];
  onAudioTrackToggle: (index: number) => void;
  selectedSubtitles: string;
  onSubtitlesChange: (subtitles: string) => void;
}

const VideoOptions: React.FC<VideoOptionsProps> = ({
  audioTracks,
  selectedTracks,
  onAudioTrackToggle,
  selectedSubtitles,
  onSubtitlesChange
}) => {
  const { t } = useTranslation();

  return (
    <OptionsContainer>
      <h3>{t('audioTracks')}</h3>
      {audioTracks.map((track, index) => (
        <CheckboxContainer key={index}>
          <Checkbox
            type="checkbox"
            id={`audio-track-${index}`}
            checked={selectedTracks.includes(index)}
            onChange={() => onAudioTrackToggle(index)}
          />
          <Label htmlFor={`audio-track-${index}`}>{track.label}</Label>
        </CheckboxContainer>
      ))}

      <h3>{t('subtitles')}</h3>
      <RadioContainer>
        <CheckboxContainer>
          <RadioButton
            type="radio"
            id="subtitles-none"
            name="subtitles"
            value="none"
            checked={selectedSubtitles === 'none'}
            onChange={() => onSubtitlesChange('none')}
          />
          <Label htmlFor="subtitles-none">{t('noSubtitles')}</Label>
        </CheckboxContainer>
        <CheckboxContainer>
          <RadioButton
            type="radio"
            id="subtitles-original"
            name="subtitles"
            value="original"
            checked={selectedSubtitles === 'original'}
            onChange={() => onSubtitlesChange('original')}
          />
          <Label htmlFor="subtitles-original">{t('originalSubtitles')}</Label>
        </CheckboxContainer>
        <CheckboxContainer>
          <RadioButton
            type="radio"
            id="subtitles-dubbed"
            name="subtitles"
            value="dubbed"
            checked={selectedSubtitles === 'dubbed'}
            onChange={() => onSubtitlesChange('dubbed')}
          />
          <Label htmlFor="subtitles-dubbed">{t('dubbedSubtitles')}</Label>
        </CheckboxContainer>
      </RadioContainer>
    </OptionsContainer>
  );
};

export default VideoOptions;
