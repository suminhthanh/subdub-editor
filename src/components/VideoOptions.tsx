import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { colors, Button } from '../styles/designSystem';
import { speakerService, Speaker } from '../services/SpeakerService';

const OptionsContainer = styled.div`
  padding: 20px;
  background-color: ${colors.background};
  height: 100%;
  overflow-y: auto;
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

const SpeakerList = styled.div`
  margin-top: 20px;
`;

const SpeakerItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const SpeakerInput = styled.input`
  margin-right: 10px;
  padding: 5px;
  border: 1px solid ${colors.border};
  border-radius: 4px;
`;

const AddSpeakerButton = styled(Button)`
  margin-top: 10px;
`;

const ColorSquare = styled.div<{ color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: ${props => props.color};
  margin-right: 10px;
  cursor: pointer;
`;

const ColorInput = styled.input`
  width: 60px;
  margin-left: 10px;
`;

interface VideoOptionsProps {
  audioTracks: { buffer: ArrayBuffer | AudioBuffer; label: string }[];
  selectedTracks: number[];
  onAudioTrackToggle: (index: number) => void;
  selectedSubtitles: string;
  onSubtitlesChange: (subtitles: string) => void;
  showSpeakerColors: boolean;
  onShowSpeakerColorsChange: (show: boolean) => void;
}

const VideoOptions: React.FC<VideoOptionsProps> = ({
  audioTracks,
  selectedTracks,
  onAudioTrackToggle,
  selectedSubtitles,
  onSubtitlesChange,
  showSpeakerColors,
  onShowSpeakerColorsChange,
}) => {
  const { t } = useTranslation();
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [speakers, setSpeakers] = useState<Speaker[]>(speakerService.getSpeakers());

  const handleSpeakerNameChange = (id: string, newName: string) => {
    speakerService.updateSpeaker(id, { name: newName });
    setSpeakers([...speakerService.getSpeakers()]);
  };

  const handleSpeakerColorChange = (id: string, newColor: string) => {
    speakerService.updateSpeaker(id, { color: newColor });
    setSpeakers([...speakerService.getSpeakers()]);
  };

  const handleAddSpeaker = () => {
    if (newSpeakerName.trim()) {
      speakerService.addSpeaker(newSpeakerName.trim());
      setSpeakers([...speakerService.getSpeakers()]);
      setNewSpeakerName('');
    }
  };

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

      <h3>{t('speakers')}</h3>
      <CheckboxContainer>
        <Checkbox
          type="checkbox"
          id="show-speaker-colors"
          checked={showSpeakerColors}
          onChange={(e) => onShowSpeakerColorsChange(e.target.checked)}
        />
        <Label htmlFor="show-speaker-colors">{t('showSpeakerColors')}</Label>
      </CheckboxContainer>
      <SpeakerList>
        {speakers.map(speaker => (
          <SpeakerItem key={speaker.id}>
            <ColorSquare 
              color={speaker.color} 
              onClick={() => {
                const input = document.getElementById(`color-${speaker.id}`) as HTMLInputElement;
                input.click();
              }}
            />
            <SpeakerInput
              value={speaker.name}
              onChange={(e) => handleSpeakerNameChange(speaker.id, e.target.value)}
            />
            <span>{speaker.voice}</span>
            <ColorInput
              id={`color-${speaker.id}`}
              type="color"
              value={speaker.color}
              onChange={(e) => handleSpeakerColorChange(speaker.id, e.target.value)}
            />
          </SpeakerItem>
        ))}
      </SpeakerList>
      <SpeakerItem>
        <SpeakerInput
          value={newSpeakerName}
          onChange={(e) => setNewSpeakerName(e.target.value)}
          placeholder={t('newSpeakerName')}
        />
        <AddSpeakerButton onClick={handleAddSpeaker}>+</AddSpeakerButton>
      </SpeakerItem>
    </OptionsContainer>
  );
};

export default VideoOptions;
