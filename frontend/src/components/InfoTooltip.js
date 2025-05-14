import React, { useState } from 'react';

export default function InfoTooltip({ content, children }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '30px',
          backgroundColor: '#2d3748',
          color: '#e2e8f0',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          whiteSpace: 'pre-line',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          maxWidth: '250px',
          textAlign: 'left'
        }}>
          {content}
        </div>
      )}
    </div>
  );
} 