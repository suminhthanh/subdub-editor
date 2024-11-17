import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button, ModalOverlay, Title, Message, ErrorMessage, ErrorBox } from '../styles/designSystem';

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

interface RegenerateModalProps {
  onClose: () => void;
  onRegenerate: () => Promise<void>;
}

const RegenerateModal: React.FC<RegenerateModalProps> = ({ onClose, onRegenerate }) => {
  const { t } = useTranslation();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate();
      setIsComplete(true);
    } catch (error) {
      console.error('Error regenerating video:', error);
      setError(`${error}`);
    }
  };

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <Title>{t('regenerate')}</Title>
        {error ? (
          <>
            <ErrorMessage>{t('errorRegenerating')}</ErrorMessage>
            <ErrorBox>{error}</ErrorBox>
          </>
        ) : (
          <Message>
            {isComplete
              ? t('regenerateRequestSent')
              : t('regenerateDescription')}
          </Message>
        )}
        <ButtonContainer>
          {!isComplete && !error ? (
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