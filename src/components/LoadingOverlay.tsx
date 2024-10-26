import React from 'react';
import styled, { keyframes } from 'styled-components';
import { colors } from '../styles/designSystem';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const Spinner = styled.div`
  border: 4px solid ${colors.background};
  border-top: 4px solid ${colors.primary};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.p`
  color: ${colors.white};
  margin-top: 20px;
  font-size: 18px;
`;

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => (
  <Overlay>
    <div>
      <Spinner />
      <LoadingText>{message}</LoadingText>
    </div>
  </Overlay>
);

export default LoadingOverlay;
