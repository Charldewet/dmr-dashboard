import React, { useState } from 'react';
import DailyView from './views/DailyView';
import MonthlyView from './views/MonthlyView';
import YearlyView from './views/YearlyView';
import StockView from './views/StockView';
import './App.css';

const PHARMACY_OPTIONS = [
  { label: 'TLC Reitz', value: 'reitz' },
  { label: 'TLC Villiers', value: 'villiers' },
  { label: 'TLC Roos', value: 'roos' },
  { label: 'TLC Tugela', value: 'tugela' },
  { label: 'TLC Winterton', value: 'winterton' },
];

function App() {
  const [view, setView] = useState('daily');
  const [selectedPharmacy, setSelectedPharmacy] = useState(PHARMACY_OPTIONS[0].value);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navBtnStyle = {
    background: '#232b3b',
    color: '#bdbdbd',
    padding: '0.6rem 1.1rem',
    borderRadius: '8px',
    fontWeight: 500,
    fontSize: '0.9rem',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
    marginRight: '1mm',
    transition: 'background 0.18s, color 0.18s',
  };
  const navBtnActiveStyle = {
    ...navBtnStyle,
    background: '#FF4500',
    color: '#fff',
    fontWeight: 800,
  };

  const selectedPharmacyLabel = PHARMACY_OPTIONS.find(opt => opt.value === selectedPharmacy)?.label || '';

  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 18, left: 18, display: 'flex', alignItems: 'center', zIndex: 10 }}>
        <img
          src="/the-local-choice-logo.png"
          alt="Pharmacy Logo"
          style={{ height: 38, width: 'auto', marginRight: 10 }}
        />
        <div style={{ position: 'relative' }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
            onClick={() => setDropdownOpen(v => !v)}
            tabIndex={0}
          >
            {selectedPharmacyLabel}
            <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
              <svg width="15" height="8" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="3,4 10,11 17,4" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              background: '#232b3b',
              color: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              minWidth: 140,
              zIndex: 100,
              padding: '4px 0',
            }}>
              {PHARMACY_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  style={{
                    padding: '7px 16px',
                    cursor: 'pointer',
                    background: selectedPharmacy === opt.value ? '#FF4500' : 'none',
                    color: selectedPharmacy === opt.value ? '#fff' : '#fff',
                    fontWeight: selectedPharmacy === opt.value ? 700 : 500,
                  }}
                  onClick={() => {
                    setSelectedPharmacy(opt.value);
                    setDropdownOpen(false);
                  }}
                  onMouseDown={e => e.preventDefault()}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 'calc(2.5rem + 8mm)', marginBottom: '2.5rem' }}>
        <button
          style={view === 'daily' ? navBtnActiveStyle : navBtnStyle}
          onClick={() => setView('daily')}
        >
          Daily
        </button>
        <button
          style={view === 'monthly' ? navBtnActiveStyle : navBtnStyle}
          onClick={() => setView('monthly')}
        >
          Monthly
        </button>
        <button
          style={view === 'yearly' ? navBtnActiveStyle : navBtnStyle}
          onClick={() => setView('yearly')}
        >
          Yearly
        </button>
        <button
          style={{ ...(view === 'stock' ? navBtnActiveStyle : navBtnStyle), marginRight: 0 }}
          onClick={() => setView('stock')}
        >
          Stock
        </button>
      </div>
      {view === 'daily' && <DailyView />}
      {view === 'monthly' && <MonthlyView />}
      {view === 'yearly' && <YearlyView />}
      {view === 'stock' && <StockView />}
    </div>
  );
}

export default App;

