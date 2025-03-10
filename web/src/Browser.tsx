// web/src/Browser.tsx
import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import { eventBus } from './services/EventBus'; // <-- Imported local event bus
import { UIElement, Action } from './domain';

const VIEWPORT_WIDTH = 1000; // have to be received from the server
const VIEWPORT_HEIGHT = 600;

const hashString = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return (hash >>> 0).toString(16); 
  for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i); 
      hash |= 0;
  }
  return (hash >>> 0).toString(16);
};

const Browser: React.FC = () => {
  const [screenshot, setScreenshot] = useState('');
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const [highlightElement, setHighlightElement] = useState<UIElement | null>(null);
  const [highlightAction, setHighlightAction] = useState<Action | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const screenshotDataMap = useRef(new Map<string, string>());
  const lastScreenshotRef = useRef('');
  const [viewingHistory, setViewingHistory] = useState(false);

  useEffect(() => {
    socket.on('browser_screenshot', (data: string) => {
      const newScreenshot = `data:image/png;base64,${data}`;
      if (!viewingHistory) {
        setScreenshot(newScreenshot);
      }
      lastScreenshotRef.current = newScreenshot;
      const hash = hashString(data);
      screenshotDataMap.current.set(hash, newScreenshot);
      // --- Emit the current screenshot hash ---
      eventBus.emit('current_screenshot_hash', hash);
    });

    return () => {
      socket.off('browser_screenshot');
    };
  }, [viewingHistory]);

  // Use the eventBus to listen for highlight events instead of socket events
  useEffect(() => {
    const handleHighlightUiElement = (element: UIElement) => {
      setHighlightElement(element);
    };

    const handleHideUiElement = () => {
      setHighlightElement(null);
    };

    eventBus.on('highlight_ui_element', handleHighlightUiElement);
    eventBus.on('hide_ui_element', handleHideUiElement);

    return () => {
      eventBus.off('highlight_ui_element', handleHighlightUiElement);
      eventBus.off('hide_ui_element', handleHideUiElement);
    };
  }, []);

  useEffect(() => {
    const handleHighlightAction = (action: Action) => {
      setHighlightAction(action);
    };

    const handleHideAction = () => {
      setHighlightAction(null);
    };

    eventBus.on('highlight_action', handleHighlightAction);
    eventBus.on('hide_action', handleHideAction);

    return () => {
      eventBus.off('highlight_action', handleHighlightAction);
      eventBus.off('hide_action', handleHideAction);
    };
  }, []);

  useEffect(() => {
    const handleDisplayHistoryScreenshot = (hash: string | null) => {
      if (hash === undefined) {
        setViewingHistory(true);
        setScreenshot('');
      } else if (hash === null) {
        setViewingHistory(false);
        setScreenshot(lastScreenshotRef.current);
      } else if (screenshotDataMap.current.has(hash)) {
        setViewingHistory(true);
        setScreenshot(screenshotDataMap.current.get(hash)!);
      }
    };

    eventBus.on('display_history_screenshot', handleDisplayHistoryScreenshot);
    return () => {
      eventBus.off('display_history_screenshot', handleDisplayHistoryScreenshot);
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = VIEWPORT_WIDTH / rect.width;
    const scaleY = VIEWPORT_HEIGHT / rect.height;
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);
    setMouseCoords({ x, y });
  };

  const getHighlightStyle = (): React.CSSProperties => {
    if (!imgRef.current || !highlightElement) return {};
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = rect.width / VIEWPORT_WIDTH;
    const scaleY = rect.height / VIEWPORT_HEIGHT;
    return {
      position: 'absolute',
      top: highlightElement.y1 * scaleY,
      left: highlightElement.x1 * scaleX,
      width: (highlightElement.x2 - highlightElement.x1) * scaleX,
      height: (highlightElement.y2 - highlightElement.y1) * scaleY,
      border: '2px solid red',
      pointerEvents: 'none'
    };
  };

  const getActionHighlightStyle = (): React.CSSProperties => {
    if (!imgRef.current || !highlightAction) return {};
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = rect.width / VIEWPORT_WIDTH;
    const scaleY = rect.height / VIEWPORT_HEIGHT;
    
    const { interaction } = highlightAction;
    const point = interaction.mouseClick || interaction.mouseHover || interaction.mouseScroll;
    if (!point) return {};

    const size = 2;
    const x = Math.round(point.x * scaleX - size / 2);
    const y = Math.round(point.y * scaleY - size / 2);
    return {
      position: 'absolute',
      top: y,
      left: x,
      width: size,
      height: size,
      border: '5px solid red',
      borderRadius: '50%',
      pointerEvents: 'none'
    };
  };

  return (
    <div className="browser" style={{ position: 'relative' }}>
      {screenshot ? (
        <>
          <img
            src={screenshot}
            alt="Browser View"
            onMouseMove={handleMouseMove}
            width="100%"
            ref={imgRef}
          />
          {highlightElement && imgRef.current && <div style={getHighlightStyle()} />}
          {highlightAction && imgRef.current && <div style={getActionHighlightStyle()} />}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '5px',
              borderRadius: '5px',
            }}
          >
            x: {mouseCoords.x}, y: {mouseCoords.y}
          </div>
        </>
      ) : (
        <p style={{ padding: '20px' }}>Loading browser view...</p>
      )}
    </div>
  );
};

export default Browser;
