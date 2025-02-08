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

  const [commands, setCommands] = useState<string[]>([]);
  const [commandIndex, setCommandIndex] = useState<number>(0);
  const [executingScript, setExecutingScript] = useState<boolean>(false);

  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [tempInput, setTempInput] = useState<string>('');

  const [isAutoMode, setIsAutoMode] = useState(false);

  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  const messagesRef = useRef<Message[]>(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    socket.on('server_response', (message: string) => {
      console.log('[server_response]', message);
      setLoading(false);
      setIsWaitingForResponse(false);

      const newMessage: Message = { role: 'assistant', content: message };
      // Store the assistant message in history before updating state
      const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      localStorage.setItem('chatHistory', JSON.stringify([...existingHistory, newMessage]));
      
      setMessages(prev => [...prev, newMessage]);

      if (executingScript) {
        setCommandIndex((prevIndex) => prevIndex + 1);
      }
    });

    return () => {
      socket.off('server_response');
    };
  }, [executingScript]);

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

  const addUserScriptMessage = useCallback((command: string) => {
    const scriptMessage: Message = { 
      role: 'user', 
      content: "script execution:\n\n```\n" + command + "\n```" 
    };
    const allActualMessages: Message[] = [
      ...messagesRef.current,
      scriptMessage,
    ];
    setMessages(allActualMessages);
    
    // Store the script message in history
    const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    localStorage.setItem('chatHistory', JSON.stringify([...existingHistory, scriptMessage]));
    
    console.log('[user_script]', command);
  }, []);

  useEffect(() => {
    if (executingScript && commandIndex < commands.length && !loading) {
      console.log('Executing command:', commandIndex);
      const currentCommand = commands[commandIndex];
      if (currentCommand.includes('goto ')) {
        const gotoStep = currentCommand.split('goto ')[1];
        const gotoCommandIndex = commands.findIndex((command) => command.startsWith(`${gotoStep}.`));
        if (gotoCommandIndex !== -1) {
          setCommandIndex(gotoCommandIndex);
        }
        return;
      }
      sendSingleCommand(currentCommand);
    } else if (executingScript && commandIndex >= commands.length) {
      setExecutingScript(false);
    }
  }, [commandIndex, commands, executingScript, loading, sendSingleCommand]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = () => {
    if (loading) return; 

    const userCommand = input.trim();
    if (userCommand) {
      const lines = userCommand.split('\n');
      const containsScript = lines.length > 1;

      if (containsScript) {
        setCommands(lines);
        setCommandIndex(0);
        setExecutingScript(true);
        addUserScriptMessage(input);
        setInput('');
      } else {
        sendSingleCommand(userCommand);
        setInput('');
        setLoading(true);
      }
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

  const stopScript = () => {
    setExecutingScript(false);
    setCommandIndex(0);
    setLoading(false);
  };

  const abortMission = () => {
    socket.emit('abort_execution');
    setExecutingScript(false);
    setCommandIndex(0);
    setLoading(false);
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

  const handleNextStep = () => {
    setIsWaitingForResponse(true);
    socket.emit('next_step');
  };

  const toggleAutoMode = () => {
    const newMode = !isAutoMode;
    setIsAutoMode(newMode);
    socket.emit(newMode ? 'switch_to_auto' : 'switch_to_step_by_step');
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
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          {executingScript && (
            <button 
              onClick={stopScript}
              style={{
                padding: '5px 10px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Stop Script
            </button>
          )}
          {!isAutoMode && (
            <button
              onClick={handleNextStep}
              disabled={isWaitingForResponse}
              style={{
                padding: '5px 10px',
                backgroundColor: isWaitingForResponse ? '#93c7a4' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isWaitingForResponse ? 'default' : 'pointer'
              }}
            >
              Next step
            </button>
          )}
          <button
            onClick={toggleAutoMode}
            style={{
              padding: '5px 10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isAutoMode ? 'Switch to Step by step' : 'Switch to Auto'}
          </button>
          
          <button 
            onClick={abortMission}
            style={{
              padding: '5px 10px',
              backgroundColor: '#ff8c00',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Abort Mission
          </button>
        </div>
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
