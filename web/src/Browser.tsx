// src/Browser.tsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');
const VIEWPORT_WIDTH = 1000; // have to be received from the server
const VIEWPORT_HEIGHT = 800;

const Browser: React.FC = () => {
  const [screenshot, setScreenshot] = useState('');
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    socket.on('browser_screenshot', (data: string) => {
      setScreenshot(`data:image/png;base64,${data}`);
    });

    return () => {
      socket.off('browser_screenshot');
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

  return (
    <div className="browser" style={{ position: 'relative' }}>
      {screenshot ? (
        <>
          <img
            src={screenshot}
            alt="Browser View"
            onMouseMove={handleMouseMove}
            width="100%"
          />
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
