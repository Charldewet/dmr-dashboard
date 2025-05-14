import React from 'react';

export default function Header({
  isLoggedIn,
  currentUser,
  allowedPharmacies = [],
  selectedPharmacy,
  setSelectedPharmacy,
  setView,
  setMobileNavOpen,
  handleLogout
}) {
  const [mobileNavOpen, setLocalMobileNavOpen] = React.useState(false);

  // Handle mobile nav toggle
  const toggleMobileNav = () => {
    setLocalMobileNavOpen((open) => !open);
    if (setMobileNavOpen) setMobileNavOpen((open) => !open);
  };

  // Pharmacy options (fallback)
  const PHARMACY_OPTIONS = [
    { label: 'TLC Reitz', value: 'reitz' },
    { label: 'TLC Villiers', value: 'villiers' },
    { label: 'TLC Roos', value: 'roos' },
    { label: 'TLC Tugela', value: 'tugela' },
    { label: 'TLC Winterton', value: 'winterton' },
  ];

  const pharmacyOptions = allowedPharmacies.length > 0
    ? PHARMACY_OPTIONS.filter(opt => allowedPharmacies.includes(opt.value))
    : PHARMACY_OPTIONS;

  return (
    <header className="dashboard-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img 
          src="/the-local-choice-logo.png" 
          alt="TLC Logo" 
          style={{ height: '60px' }}
        />
        <h2 style={{ marginTop: '1.2rem' }}>
          {pharmacyOptions.find(opt => opt.value === selectedPharmacy)?.label || ''}
        </h2>
      </div>
      {/* Hamburger icon for mobile */}
      <button
        className="hamburger-menu-btn"
        aria-label="Open navigation menu"
        onClick={toggleMobileNav}
        style={{ display: 'none' }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect y="7" width="32" height="3.5" rx="1.75" fill="#fff"/>
          <rect y="14" width="32" height="3.5" rx="1.75" fill="#fff"/>
          <rect y="21" width="32" height="3.5" rx="1.75" fill="#fff"/>
        </svg>
      </button>
      {/* Navigation: normal on desktop, overlay on mobile if open */}
      <nav className={`dashboard-nav${mobileNavOpen ? ' mobile-open' : ''}`}>
        <select
          value={selectedPharmacy}
          onChange={e => setSelectedPharmacy(e.target.value)}
          style={{
            marginRight: '0.75rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            background: '#232b3b',
            color: '#fff',
            border: '1px solid #374151',
            cursor: 'pointer',
            opacity: 1
          }}
        >
          {pharmacyOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={() => { setView('dashboard'); setLocalMobileNavOpen(false); }}
          className="button button-primary"
        >
          Dashboard
        </button>
        <button
          onClick={() => { setView('monthly'); setLocalMobileNavOpen(false); }}
          className="button button-primary"
        >
          Monthly
        </button>
        <button
          onClick={() => { setView('yearly'); setLocalMobileNavOpen(false); }}
          className="button button-primary"
        >
          Yearly
        </button>
        <button
          onClick={() => { setView('stock'); setLocalMobileNavOpen(false); }}
          className="button button-primary"
        >
          Stock
        </button>
        <div className="update-button-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleLogout}
            className="button button-primary button-logout"
          >
            Logout{currentUser ? ` (${currentUser})` : ''}
          </button>
        </div>
      </nav>
      {/* Mobile nav overlay background */}
      {mobileNavOpen && <div className="mobile-nav-overlay" onClick={toggleMobileNav}></div>}
    </header>
  );
} 