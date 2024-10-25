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

interface AudioOptionsProps {
  audioTracks: { buffer: ArrayBuffer | AudioBuffer; label: string }[];
  selectedTracks: number[];
  onAudioTrackToggle: (index: number) => void;
}

const VideoOptions: React.FC<AudioOptionsProps> = ({ audioTracks, selectedTracks, onAudioTrackToggle }) => {
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
    </OptionsContainer>
  );
};

export default VideoOptions;
