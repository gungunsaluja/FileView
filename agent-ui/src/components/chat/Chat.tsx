import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useWebSocket, type WebSocketMessage } from '../../hooks/useWebSocket';

type MessageType = 'user' | 'assistant';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  displayContent?: string;
}

interface ChatProps {
  className?: string;
}

const AGENT_GREEN = '#02a954';
const WS_URL = 'ws://localhost:8080';

const Chat: React.FC<ChatProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: '👋 Hi! How can we help?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const prevScrollHeightRef = useRef(0);
  

  const currentAssistantIdRef = useRef<string | null>(null);


  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('Connected to chat server');
        break;

      case 'thinking':
       
        setThinkingText(message.content);
        break;

      case 'thinking_done':
        break;

      case 'stream':
        
        setThinkingText(null);
        
        
        if (!currentAssistantIdRef.current) {
          const assistantId = `assistant-${Date.now()}`;
          currentAssistantIdRef.current = assistantId;
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              type: 'assistant',
              content: message.content,
              timestamp: new Date(),
              isStreaming: true,
              displayContent: message.content,
            },
          ]);
        } else {
       
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentAssistantIdRef.current
                ? {
                    ...msg,
                    displayContent: (msg.displayContent || '') + message.content,
                    content: (msg.content || '') + message.content,
                  }
                : msg
            )
          );
        }
        
        if (isAtBottomRef.current && chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        break;

      case 'done':
     
        if (currentAssistantIdRef.current) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentAssistantIdRef.current
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
          currentAssistantIdRef.current = null;
        }
        setThinkingText(null);
        setIsWaiting(false);
        break;

      case 'error':
        
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            type: 'assistant',
            content: message.content || 'Something went wrong. Please try again.',
            timestamp: new Date(),
          },
        ]);
        setThinkingText(null);
        currentAssistantIdRef.current = null;
        setIsWaiting(false);
        break;
    }
  }, []);

  const { isConnected, isConnecting, sendMessage, connect } = useWebSocket({
    url: WS_URL,
    onMessage: handleWebSocketMessage,
    onDisconnect: () => {
      setIsWaiting(false);
      setThinkingText(null);
    },
  });

  
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  
  const checkIsAtBottom = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  }, []);


  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', checkIsAtBottom);
    return () => container.removeEventListener('scroll', checkIsAtBottom);
  }, [checkIsAtBottom]);

  
  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    if (isAtBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }

    prevScrollHeightRef.current = container.scrollHeight;
  }, [messages, thinkingText]);

  const handleSend = async (messageText?: string) => {
    const text = (messageText ?? inputValue).trim();
    if (!text || isWaiting) return;

   
    if (!isConnected) {
      connect();
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsWaiting(true);
    sendMessage(text);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.type === 'user';
    const displayText = message.isStreaming ? message.displayContent : message.content;

    if (!isUser && !displayText) {
      return null;
    }

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
        <div
          className={`max-w-xl rounded-3xl px-6 py-4 text-lg leading-relaxed ${
            isUser
              ? 'bg-white text-green-400 border-2'
              : 'text-white'
          }`}
          style={
            isUser
              ? { borderColor: AGENT_GREEN, boxShadow: '0 15px 25px rgba(2, 120, 84, 0.15)' }
              : { backgroundColor: AGENT_GREEN }
          }
        >
          <p className="whitespace-pre-wrap">{displayText}</p>
        </div>
      </div>
    );
  };

 
  const ThinkingIndicator = () => {
    if (!thinkingText) return null;
    
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="italic">{thinkingText}</span>
      </div>
    );
  };

  const ConnectionStatus = () => {
    if (isConnecting) {
      return (
        <div className="flex items-center gap-2 text-sm text-yellow-600">
          <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          Connecting...
        </div>
      );
    }
    if (!isConnected) {
      return (
        <button
          onClick={connect}
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
        >
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Disconnected - Click to reconnect
        </button>
      );
    }
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Connected
      </div>
    );
  };

  return (
    <div className={`relative flex h-full flex-col bg-white ${className}`}>
      <div className="border-b border-gray-100 px-6 py-2">
        <ConnectionStatus />
      </div>
      <div className="flex-1 overflow-hidden p-6">
        <div
          ref={chatContainerRef}
          className="flex h-full flex-col gap-5 overflow-y-auto pr-4"
          style={{ scrollBehavior: 'smooth' }}
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
         
          <ThinkingIndicator />
          <div ref={messagesEndRef} />
        </div>
      </div>
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110"
          style={{ backgroundColor: AGENT_GREEN }}
          aria-label="Scroll to bottom"
        >
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center rounded-full border border-gray-200 bg-white px-5 py-3 shadow-sm">
          <input
            type="text"
            placeholder={isConnected ? "Type here and press enter..." : "Connect to start chatting..."}
            className="flex-1 border-none text-base text-gray-700 placeholder:text-gray-400 focus:outline-none"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isWaiting || !isConnected}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isWaiting || !isConnected}
            className="rounded-full px-6 py-2 text-sm font-semibold text-white transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300"
            style={{ backgroundColor: inputValue.trim() && isConnected ? AGENT_GREEN : undefined }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
