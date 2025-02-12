// web/src/socket.ts
import io from 'socket.io-client';

export const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Socket connected');
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

// Debug all incoming events
socket.onAny((eventName, ...args) => {
  console.log('Received event:', eventName, args);
}); 