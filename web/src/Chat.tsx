// src/Chat.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import './github-markdown-light.css'

const socket = io('http://localhost:5000');

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');

  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [tempInput, setTempInput] = useState<string>('');

  const messagesRef = useRef<Message[]>(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    socket.on('server_response', (message: string) => {
      console.log('[server_response]', message);
      const newMessage: Message = { role: 'assistant', content: message };
      const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      localStorage.setItem('chatHistory', JSON.stringify([...existingHistory, newMessage]));
      setMessages(prev => [...prev, newMessage]);
    });

    return () => {
      socket.off('server_response');
    };
  }, []);

  useEffect(() => {
    socket.on('function_completed', () => {
      setLoading(false);
    });

    return () => {
      socket.off('function_completed');
    };
  }, []);

  const sendSingleCommand = useCallback((command: string) => {
    const userMessage: Message = { role: 'user', content: command };
    const allActualMessages: Message[] = [
      ...messagesRef.current,
      userMessage,
    ];

    if (command.startsWith("{{")) {
      const maskedCommand = command.split("=")[0] + "=";
      const maskedMessage: Message = { role: 'user', content: maskedCommand };
      const allMessagesWithoutScriptInputVariables: Message[] = [
        ...messagesRef.current,
        maskedMessage,
      ];
      setMessages(allMessagesWithoutScriptInputVariables);
      console.log('[user_message]', maskedCommand);
      
      // Store the actual (unmasked) message in history
      const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      localStorage.setItem('chatHistory', JSON.stringify([...existingHistory, userMessage]));
    } else {
      setMessages(allActualMessages);
      console.log('[user_message]', command);
      
      // Store the message in history
      const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      localStorage.setItem('chatHistory', JSON.stringify([...existingHistory, userMessage]));
    }
    socket.emit('user_message', JSON.stringify(allActualMessages));
    
    setLoading(true);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = () => {
    if (loading) return; 

    const userCommand = input.trim();
    if (userCommand) {
      sendSingleCommand(userCommand);
      setInput('');
      setLoading(true);
    }
  };

  // Send on Enter (unless Shift+Enter is pressed)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setHistoryIndex(null);
      sendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    // Create a map to store the last instance of each unique command
    const uniqueCommands = new Map();
    const userMessages = history
      .filter((msg: Message) => msg.role === 'user')
      .reverse() // Reverse to process from newest to oldest
      .filter((msg: Message) => {
        if (!uniqueCommands.has(msg.content)) {
          uniqueCommands.set(msg.content, true);
          return true;
        }
        return false;
      })
      .reverse(); // Reverse back to maintain chronological order

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      
      // If we haven't started navigating history yet, save current input
      if (historyIndex === null) {
        setTempInput(input);
        // Start from the most recent message
        const newIndex = userMessages.length - 1;
        if (newIndex >= 0) {
          setHistoryIndex(newIndex);
          setInput(userMessages[newIndex].content);
        }
      } else if (historyIndex > 0) {
        // Move backwards through history
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(userMessages[newIndex].content);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      
      if (historyIndex !== null) {
        if (historyIndex < userMessages.length - 1) {
          // Move forwards through history
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInput(userMessages[newIndex].content);
        } else {
          // Restore the original input when we reach the end
          setHistoryIndex(null);
          setInput(tempInput);
        }
      }
    }
  };

  return (
    <div className="chat">
      <div className="messages" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {messages.map((msg, ind) => (
          <div
            className="markdown-rendered"
            style={{
              marginBottom: 20,
              background: msg.role === 'user' ? 'moccasin' : 'transparent',
            }}
            key={ind}
          >
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
              {msg.content}
            </ReactMarkdown> 
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding: '10px' }}>
        
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: '10px',
            boxSizing: 'border-box',
            backgroundColor: loading ? '#eee' : 'transparent',
            height: '100px',
          }}
          placeholder="Type your command or script..."
          ref={(textarea) => textarea && textarea.focus()}
        />
      </div>
    </div>
  );
};

export default Chat;
