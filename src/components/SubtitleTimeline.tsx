import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import SubtitleItem from './SubtitleItem';
import { Subtitle } from '../services/FFmpegService';

const TimelineContainer = styled.div`
  background-color: #ffd8a8;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const TimelineHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 10px;
`;

const TimelineContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

const Timeline = styled.div`
  position: relative;
  min-width: 100%;
  height: auto;
`;

const CurrentTimeIndicator = styled.div`
  position: absolute;
  top: 30px; // Adjusted to account for Ruler height
  bottom: 0;
  width: 2px;
  background-color: #ff6b6b;
  z-index: 10;
`;

const SubtitleRow = styled.div`
  position: relative;
  height: 40px;
  margin-bottom: 5px;
`;

const Ruler = styled.div`
  height: 30px;
  position: sticky;
  top: 0;
  left: 0;
  background-color: #ffe8cc;
  z-index: 5;
  display: flex;
  align-items: flex-end;
`;

const TimeMarker = styled.div`
  position: absolute;
  bottom: 0;
  font-size: 10px;
  transform: translateX(-50%);
`;

const ZoomControls = styled.div`
  display: flex;
  gap: 5px;
`;

const ZoomButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  width: 30px;
  height: 30px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.9);
  }
`;

const ClickableRuler = styled(Ruler)`
  cursor: pointer;
`;

interface SubtitleTimelineProps {
  subtitles: Subtitle[];
  setSubtitles: React.Dispatch<React.SetStateAction<Subtitle[]>>;
  currentTime: number;
  onTimeChange: (time: number) => void;
}

const DEFAULT_ZOOM = 10;
const MIN_ZOOM = 1;
const MAX_ZOOM = 100;

const SubtitleTimeline: React.FC<SubtitleTimelineProps> = ({ subtitles, setSubtitles, currentTime, onTimeChange }) => {
  const { t } = useTranslation();
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM); // pixels per second
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSubtitleChange = (index: number, updatedSubtitle: Subtitle) => {
    const newSubtitles = [...subtitles];
    newSubtitles[index] = updatedSubtitle;
    setSubtitles(newSubtitles);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, MAX_ZOOM));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, MIN_ZOOM));
  const handleResetZoom = () => setZoomLevel(DEFAULT_ZOOM);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel(prev => Math.min(Math.max(prev * delta, MIN_ZOOM), MAX_ZOOM));
    } else if (scrollContainerRef.current) {
      // Handle horizontal scrolling
      if (event.deltaX !== 0) {
        event.preventDefault();
        scrollContainerRef.current.scrollLeft += event.deltaX;
      }
    }
  }, []);

  const handleRulerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newTime = clickX / zoomLevel;
    onTimeChange(newTime);
  }, [zoomLevel, onTimeChange]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleWheel]);

  const duration = Math.max(...subtitles.map(s => s.startTime + s.duration), currentTime);
  const timelineWidth = Math.max(duration * zoomLevel, 100); // Ensure a minimum width

  const renderTimeMarkers = () => {
    const markers = [];
    for (let i = 0; i <= duration; i += 5) {
      markers.push(
        <TimeMarker key={i} style={{ left: `${i * zoomLevel}px` }}>
          {formatTime(i)}
        </TimeMarker>
      );
    }
    return markers;
  };

  return (
    <TimelineContainer>
      <TimelineHeader>
        <ZoomControls>
          <ZoomButton onClick={handleZoomOut} title={t('zoomOut')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2"/>
              <line x1="14" y1="14" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
              <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </ZoomButton>
          <ZoomButton onClick={handleZoomIn} title={t('zoomIn')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2"/>
              <line x1="14" y1="14" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
              <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="6" x2="9" y2="12" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </ZoomButton>
          <ZoomButton onClick={handleResetZoom} title={t('resetZoom')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2"/>
              <line x1="14" y1="14" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 6v3h3" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </ZoomButton>
        </ZoomControls>
      </TimelineHeader>
      <TimelineContent ref={scrollContainerRef}>
        <Timeline id="subtitle-timeline" style={{ width: `${timelineWidth}px` }}>
          <ClickableRuler style={{ width: `${timelineWidth}px` }} onClick={handleRulerClick}>
            {renderTimeMarkers()}
          </ClickableRuler>
          <CurrentTimeIndicator style={{ left: `${currentTime * zoomLevel}px` }} />
          {subtitles.map((subtitle, index) => (
            <SubtitleRow key={index}>
              <SubtitleItem
                subtitle={subtitle}
                onChange={(updatedSubtitle) => handleSubtitleChange(index, updatedSubtitle)}
                zoomLevel={zoomLevel}
              />
            </SubtitleRow>
          ))}
        </Timeline>
      </TimelineContent>
    </TimelineContainer>
  );
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default SubtitleTimeline;
