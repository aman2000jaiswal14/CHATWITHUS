import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import stylesString from './index.css?inline';
import { MessageSquare, X } from 'lucide-react';

const ChatWidget = () => {
  const hostRef = useRef(null);
  const shadowRootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (hostRef.current && !shadowRootRef.current) {
      shadowRootRef.current = hostRef.current.attachShadow({ mode: 'open' });

      const styleElement = document.createElement('style');
      styleElement.textContent = stylesString;
      shadowRootRef.current.appendChild(styleElement);

      const rootContainer = document.createElement('div');
      rootContainer.id = 'chat-widget-root';
      rootContainer.style.height = '100%';
      rootContainer.style.width = '100%';
      rootContainer.style.display = 'flex';
      rootContainer.style.flexDirection = 'column';
      rootContainer.style.overflow = 'hidden';
      shadowRootRef.current.appendChild(rootContainer);

      const root = ReactDOM.createRoot(rootContainer);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    }
  }, []);

  return (
    <>
      {/* Floating Chat Panel */}
      <div
        ref={hostRef}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          width: isOpen ? '400px' : '0px',
          height: isOpen ? '560px' : '0px',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isOpen ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none',
          transition: 'width 0.3s ease, height 0.3s ease, box-shadow 0.3s ease',
          zIndex: 9998,
          border: isOpen ? '1px solid #1e293b' : 'none',
        }}
      />
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
          zIndex: 9999,
          transition: 'transform 0.2s ease, background-color 0.2s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </>
  );
};

export default ChatWidget;
