import React, { useEffect, useState } from 'react';
import axios from 'axios';
// Import any needed chart components, etc.

function MonthlyView({ selectedPharmacy }) {
  const [turnover, setTurnover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get('/api/month/2025-05/aggregates', {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setTurnover(res.data?.turnover ?? null);
        setLoading(false);
      })
      .catch(err => {
        setError('Error fetching turnover');
        setLoading(false);
      });
  }, [selectedPharmacy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2rem' }}>
      <h1>Monthly View</h1>
      <div style={{ background: '#232b3b', color: '#fff', padding: '2rem 3rem', borderRadius: '1.2rem', fontSize: '2.2rem', fontWeight: 700, marginTop: '2rem', minWidth: 320, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
        {loading ? 'Loading...' : error ? error : `Total Turnover for May 2025: R ${turnover?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
      </div>
    </div>
  );
}

export default MonthlyView; 