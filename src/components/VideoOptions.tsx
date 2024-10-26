import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { colors, Button, Label } from '../styles/designSystem';
import { speakerService, Speaker } from '../services/SpeakerService';
import { synthesisService } from '../services/SynthesisService';
import { Voice } from '../types/Voice';
import { Track } from '../types/Track';
import { AudioTrack } from '../types/AudioTrack';

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

const VoiceSelect = styled.select`
  margin-left: 10px;
  padding: 5px;
  border: 1px solid ${colors.border};
  border-radius: 4px;
`;

interface VideoOptionsProps {
  audioTracks: { [key: string]: AudioTrack };
  selectedTracks: string[];
  onAudioTrackToggle: (index: string) => void;
  selectedSubtitles: string;
  onSubtitlesChange: (subtitles: string) => void;
  showSpeakerColors: boolean;
  onShowSpeakerColorsChange: (show: boolean) => void;
  tracks: Track[];
  onTracksChange: (tracks: Track[]) => void;
  onSpeakerVoiceChange: (speakerId: string, newVoice: Voice) => void;
}

const VideoOptions: React.FC<VideoOptionsProps> = ({
  audioTracks,
  selectedTracks,
  onAudioTrackToggle,
  selectedSubtitles,
  onSubtitlesChange,
  showSpeakerColors,
  onShowSpeakerColorsChange,
  onSpeakerVoiceChange,
}) => {
  const { t } = useTranslation();
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [speakers, setSpeakers] = useState<Speaker[]>(speakerService.getSpeakers());
  const [voices, setVoices] = useState<Voice[]>([]);

  useEffect(() => {
    const loadVoices = async () => {
      const availableVoices = await synthesisService.voices();
      setVoices(availableVoices);
    };
    loadVoices();
  }, []);

  const handleSpeakerNameChange = (id: string, newName: string) => {
    speakerService.updateSpeaker(id, { name: newName });
    setSpeakers([...speakerService.getSpeakers()]);
  };

  const handleSpeakerColorChange = (id: string, newColor: string) => {
    speakerService.updateSpeaker(id, { color: newColor });
    setSpeakers([...speakerService.getSpeakers()]);
  };

  const handleSpeakerVoiceChange = async (speakerId: string, newVoiceId: string) => {
    const newVoice = voices.find(voice => voice.id === newVoiceId);
    if (newVoice) {
      await onSpeakerVoiceChange(speakerId, newVoice);
      setSpeakers([...speakerService.getSpeakers()]);
    }
  };

  const handleAddSpeaker = () => {
    if (newSpeakerName.trim() && voices.length > 0) {
      speakerService.addSpeaker(newSpeakerName.trim(), voices[0]);
      setSpeakers([...speakerService.getSpeakers()]);
      setNewSpeakerName("");
    }
  };

  return (
    <OptionsContainer>
      <h3>{t('audioTracks')}</h3>
      {Object.entries(audioTracks).filter(([id]) => id !== 'background').map(([id, track], index) => (
        <CheckboxContainer key={id}>
          <Checkbox
            type="checkbox"
            id={`audio-track-${index}`}
            checked={selectedTracks.includes(id)}
            onChange={() => onAudioTrackToggle(id)}
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
            <VoiceSelect
              value={speaker.voice.id}
              onChange={(e) => handleSpeakerVoiceChange(speaker.id, e.target.value)}
            >
              {voices.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.label}
                </option>
              ))}
            </VoiceSelect>
            <ColorInput
              id={`color-${speaker.id}`}
              type="color"
              value={speaker.color}
              onChange={(e) => handleSpeakerColorChange(speaker.id, e.target.value)}
              hidden
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
