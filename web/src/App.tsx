// web/src/App.tsx
import React from 'react';
import './App.css';
import Chat from './Chat';
import Browser from './Browser';

const App: React.FC = () => {
  return (
    <div className="container">
      <Browser />
      <Chat />
    </div>
  );
};

export default App;
