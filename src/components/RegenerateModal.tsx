import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button, ModalOverlay } from '../styles/designSystem';

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;

const Message = styled.p`
  margin: 0 0 20px 0;
  line-height: 1.5;
`;

interface RegenerateModalProps {
  onClose: () => void;
  onRegenerate: () => Promise<void>;
}

const RegenerateModal: React.FC<RegenerateModalProps> = ({ onClose, onRegenerate }) => {
  const { t } = useTranslation();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate();
      setIsComplete(true);
    } catch (error) {
      console.error('Error regenerating video:', error);
      // You might want to show an error message here
    }
  };

  return (
    <ModalOverlay>
      <ModalContent>
        <Message>
          {isComplete
            ? t('regenerateRequestSent')
            : t('regenerateDescription')}
        </Message>
        <ButtonContainer>
          {!isComplete ? (
            <>
              <Button onClick={onClose}>{t('cancel')}</Button>
              <Button 
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? t('regenerating') : t('regenerate')}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>{t('close')}</Button>
          )}
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default RegenerateModal; 