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
  const [scriptCommands, setScriptCommands] = useState<string[]>([]);
  const [scriptIndex, setScriptIndex] = useState(0);
  const [autoExecution, setAutoExecution] = useState(false);

  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [tempInput, setTempInput] = useState<string>('');

  const messagesRef = useRef<Message[]>(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeCommandRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    socket.on('server_response', (message: string) => {
      console.log('[server_response]', message);
      const newMessage: Message = { role: 'assistant', content: message };
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

  const sendUserCommand = useCallback((command: string) => {
    const userMessage: Message = { role: 'user', content: command };
    console.log('[user_message]', command);

    const allActualMessages: Message[] = [
      ...messagesRef.current,
      userMessage,
    ];

    setMessages(allActualMessages);

    const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    localStorage.setItem('chatHistory', JSON.stringify([...existingHistory, userMessage]));

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
      const commands = userCommand.split('\n').map(line => line.trim()).filter(line => line);
      if (commands.length > 1) {
        const userMessage: Message = { role: 'user', content: "Script execution started:\n\n" + userCommand };
        setMessages(prev => [...prev, userMessage]);
        
        const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        localStorage.setItem('chatHistory', JSON.stringify([...existingHistory, { role: 'user', content: userCommand }]));
        
        setScriptCommands(commands);
        setScriptIndex(0);
        setInput(''); 
      } else {
        sendUserCommand(userCommand);
        setInput('');
        // Note: sendUserCommand already calls setLoading(true)
      }
    }
  };

  const getUniqueUserCommands = useCallback((): Message[] => {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const uniqueCommands = new Map();
    return history
      .filter((msg: Message) => msg.role === 'user')
      .reverse() // Reverse to process from newest to oldest
      .filter((msg: Message) => {
        if (!uniqueCommands.has(msg.content)) {
          uniqueCommands.set(msg.content, true);
          return true;
        }
        return false;
      })
      .reverse(); 
  }, []);

  // Send on Enter (unless Shift+Enter is pressed)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setHistoryIndex(null);
      if (scriptCommands.length > 0 && scriptIndex < scriptCommands.length) {
        if (autoExecution) return;
        handleNextStep();
      } else {
        sendMessage();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && e.shiftKey) {
      const userMessages = getUniqueUserCommands();
      e.preventDefault();
      
      if (historyIndex === null) {
        setTempInput(input);
        const newIndex = userMessages.length - 1;
        if (newIndex >= 0) {
          setHistoryIndex(newIndex);
          setInput(userMessages[newIndex].content);
        }
      } else if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(userMessages[newIndex].content);
      }
    } 

    if (e.key === 'ArrowDown' && e.shiftKey) {
      const userMessages = getUniqueUserCommands();
      e.preventDefault();
      
      if (historyIndex !== null) {
        if (historyIndex < userMessages.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInput(userMessages[newIndex].content);
        } else {
          setHistoryIndex(null);
          setInput(tempInput);
        }
      }
    }
  };

  const handleNextStep = () => {
    if (loading) return;
    if (scriptIndex < scriptCommands.length) {
      let commandToSend: string;
      if (!autoExecution) {
        setScriptCommands(prev => {
          const newCommands = [...prev];
          newCommands[scriptIndex] = input;
          return newCommands;
        });
        commandToSend = input;
      } else {
        commandToSend = scriptCommands[scriptIndex];
      }
      sendUserCommand(commandToSend);
      if (!autoExecution) {
        setInput('');
      }
      setScriptIndex(prev => prev + 1);
    }
  };

  const toggleAutoMode = () => {
    setAutoExecution(prev => {
      if (!prev) {
        setInput('');
        return true;
      } else {
        if (scriptIndex < scriptCommands.length) {
          setInput(scriptCommands[scriptIndex]);
        }
        return false;
      }
    });
  };

  const handleAbort = () => {
    setScriptCommands([]);
    setScriptIndex(0);
    setAutoExecution(false);
    setInput('');
  };

  useEffect(() => {
    if (!loading && autoExecution && scriptCommands.length > 0) {
      if (scriptIndex < scriptCommands.length) {
        const nextCommand = scriptCommands[scriptIndex];
        sendUserCommand(nextCommand);
        setScriptIndex(prev => prev + 1);
      } else {
        setScriptCommands([]);
        setScriptIndex(0);
        setAutoExecution(false);
      }
    }
  }, [loading, autoExecution, scriptCommands, scriptIndex, sendUserCommand]);

  useEffect(() => {
    // Only update the input with the next command after the current function_completed event (loading becomes false)
    if (!loading && !autoExecution && scriptCommands.length > 0) {
      if (scriptIndex < scriptCommands.length) {
        setInput(scriptCommands[scriptIndex]);
      } else {
        setInput('');
      }
    }
  }, [loading, scriptCommands, scriptIndex, autoExecution]);

  useEffect(() => {
    if (activeCommandRef.current) {
      // Scroll the active command into view within its container
      activeCommandRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [scriptIndex]);

  useEffect(() => {
    socket.on('goto', (label: string) => {
      console.log('[goto]', label);
      if (scriptCommands.length > 0) {
        const newIndex = scriptCommands.findIndex(cmd => cmd.startsWith(`${label}.`));
        if (newIndex !== -1) {
          setScriptIndex(newIndex);
        }
      }
    });

    return () => {
      socket.off('goto');
    };
  }, [scriptCommands]);

  const displayScriptAndButtons = scriptCommands.length > 0 && scriptIndex < scriptCommands.length;

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
        {displayScriptAndButtons && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              onClick={handleNextStep}
              disabled={loading || autoExecution}
              style={{
                padding: '5px 10px',
                backgroundColor: loading || autoExecution ? '#93c7a4' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || autoExecution ? 'default' : 'pointer'
              }}
            >
              Next
            </button>
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
              {autoExecution ? 'Stop' : 'Auto'}
            </button>
            <button 
              onClick={handleAbort}
              style={{
                padding: '5px 10px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Abort script
            </button>
          </div>
        )}
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
        {displayScriptAndButtons && (
          <div
            className="markdown-rendered"
            style={{
              marginTop: '10px',
              maxHeight: '30vh', // 30% of the page height
              overflowY: 'auto',
              backgroundColor: '#f8f8f8',
              padding: '10px',
              border: '1px solid #ccc'
            }}
          >
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {scriptCommands.map((command, i) => (
                <li 
                  key={i} 
                  ref={i === scriptIndex ? activeCommandRef : null}
                  style={{ fontWeight: i === scriptIndex - 1 ? 'bold' : 'normal' }}
                >
                  {i === scriptIndex ? (input || command) : command}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
