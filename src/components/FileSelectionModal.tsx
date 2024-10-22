import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, ModalOverlay, ModalContent } from '../styles/designSystem';

interface FileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File | null, uuid: string | null) => void;
}

const FileSelectionModal: React.FC<FileSelectionModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [uuid, setUuid] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setUuid(''); // Clear UUID when file is selected
    }
  };

  const handleUuidChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUuid(event.target.value);
    setFile(null); // Clear file when UUID is entered
  };

  const handleSubmit = () => {
    if (file) {
      onSubmit(file, null);
    } else if (uuid) {
      onSubmit(null, uuid);
    }
    resetState();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const resetState = () => {
    setFile(null);
    setUuid('');
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <h2>{t('selectFileOrUUID')}</h2>
        <Input type="file" onChange={handleFileChange} />
        <Input
          type="text"
          placeholder={t('enterUUID')}
          value={uuid}
          onChange={handleUuidChange}
        />
        <Button onClick={handleSubmit}>{t('submit')}</Button>
        <Button onClick={handleClose}>{t('cancel')}</Button>
      </ModalContent>
    </ModalOverlay>
  );
};

export default FileSelectionModal;
