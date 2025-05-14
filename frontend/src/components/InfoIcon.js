import React from 'react';

export default function InfoIcon() {
  return (
    <span style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.8rem',
      fontWeight: 'bold',
      cursor: 'help',
      zIndex: 5
    }}>
      ?
    </span>
  );
} 