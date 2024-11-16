import styled from "styled-components";

// Color palette
export const colors = {
  white: "#ffffff",
  black: "#000000",
  primary: "#BA2626", // Vermell corporatiu
  primaryLight: "#f08080",
  secondary: "#8A0000", // Vermell fosc
  secondaryLight: "#ff6b6b",
  tertiary: "#DD0003", // Vermell llampant
  tertiaryLight: "#ff9999",
  quaternary: "#ff8000", // Taronja
  quaternaryLight: "#ffb36b",
  desactivat: "#c6c6c6",
  desactivatLight: "#e5e5e5",
  background: "#f8f8f8",
  secondaryBackground: "#ffffff",
  border: "#c7c5c5",
  accent: "#3d3df7",
  accentLight: "#6a6af8",
  text: "#333333", // Added for better contrast
  timeline: "#ffe8cc", // Added for timeline ruler
  disabled: "#999999",
};

// Typography
export const typography = {
  fontFamily: "Open Sans,Helvetica,Arial,sans-serif",
  fontSize: {
    small: "12px",
    medium: "14px",
    large: "16px",
  },
};

// Shared components
export const Button = styled.button`
  background-color: ${colors.primary};
  color: ${colors.white};
  border: none;
  padding: 10px 20px;
  font-size: ${typography.fontSize.medium};
  cursor: pointer;
  border-radius: 5px;
  font-family: ${typography.fontFamily};
  transition: background-color 0.3s;

  &:hover {
    background-color: ${colors.primaryLight};
  }

  &:disabled {
    background-color: ${colors.border};
    cursor: not-allowed;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid ${colors.border};
  border-radius: 5px;
  box-sizing: border-box;
  font-family: ${typography.fontFamily};
  font-size: ${typography.fontSize.medium};
  color: ${colors.text};
  background-color: ${colors.white};
`;

export const Select = styled.select`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  font-size: ${typography.fontSize.medium};
  border: 1px solid ${colors.border};
  border-radius: 5px;
  background-color: ${colors.white};
  font-family: ${typography.fontFamily};
  color: ${colors.text};
`;

export const TextArea = styled.textarea`
  width: 100%;
  height: 100px;
  margin-bottom: 10px;
  padding: 5px;
  font-family: ${typography.fontFamily};
  font-size: ${typography.fontSize.medium};
  border: 1px solid ${colors.border};
  border-radius: 5px;
  box-sizing: border-box;
  color: ${colors.text};
`;

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const ModalContent = styled.div`
  background-color: ${colors.background};
  padding: 20px;
  border-radius: 5px;
  width: 90vw;
  max-width: 1000px;
  color: ${colors.text};
`;

export const Label = styled.label`
  font-size: 14px;
  color: ${colors.text};
`;

export const IconButton = styled(Button)`
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  color: ${colors.primary};
  background-color: transparent;
  &:hover {
    background-color: ${colors.desactivatLight};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: transparent;
  }
`;
