import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
  PieChart, Pie,
  ComposedChart, AreaChart, Area
} from 'recharts';
import { getDaysInMonth, addMonths, format } from 'date-fns';

// --- Axios configuration for credentials ---
axios.defaults.withCredentials = true; // Send cookies with requests

// Helper function to get CSS variable value
const getCssVar = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

// --- Gauge Constants --- 
const GAUGE_MAX_TURNOVER_RATIO = 20; 
const GAUGE_MAX_INV_SALES_RATIO = 1; 
const GAUGE_MAX_DSI = 60; 
const GAUGE_BACKGROUND_COLOR = '#E2E8F0'; // Grey background for gauge
// --- Color Palette ---
// Coquelicot: #FF4509
// Gold: #FFD600
// Electric Purple: #B200FF
// Chartreuse: #7FFF00
const COLOR_COQUELICOT = '#FF4509';
const COLOR_GOLD = '#FFD600';
const COLOR_ELECTRIC_PURPLE = '#B200FF';
const COLOR_CHARTREUSE = '#7FFF00';
const COLOR_WHITE = '#FFFFFF';
// --- End Color Palette ---

// Update gauge/chart color constants to use new palette
const GAUGE_COLORS_RECHARTS = {
  turnover: COLOR_ELECTRIC_PURPLE, // Electric Purple
  invSales: COLOR_COQUELICOT,      // Coquelicot
  dsi: COLOR_GOLD                  // Gold
};
const DONUT_COLORS = [COLOR_COQUELICOT, '#f1f1f1']; // Use Coquelicot for main, light grey for secondary
// --- End Gauge Constants ---

// --- GaugeChart Component for Half-Donut (SVG) ---
function GaugeChart({ value, max, color, label }) {
  // Clamp value between 0 and max
  const safeValue = typeof value === 'number' && isFinite(value) ? Math.max(0, Math.min(value, max)) : null;
  const percent = safeValue != null ? safeValue / max : 0;
  const angle = percent * 180; // 0 to 180 degrees

  // Arc constants
  const size = 180; // Larger SVG viewport size
  const strokeWidth = 22; // Thicker arc
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Helper to describe arc
  function describeArc(cx, cy, r, startAngle, endAngle) {
    const rad = (deg) => (Math.PI * deg) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return [
      'M', x1, y1,
      'A', r, r, 0, largeArc, 1, x2, y2
    ].join(' ');
  }

  // Arc paths
  const bgArc = describeArc(center, center, radius, 180, 0);
  const fgArc = describeArc(center, center, radius, 180, 180 + angle);

  return (
    <div className="gauge-chart-container" style={{ width: '100%', height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} style={{ display: 'block' }}>
        {/* Background arc */}
        <path d={bgArc} fill="none" stroke="#38404a" strokeWidth={strokeWidth} />
        {/* Foreground arc */}
        {safeValue != null && (
          <path d={fgArc} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
      </svg>
      {/* Centered Value */}
      <div style={{
        position: 'absolute',
        top: '54px',
        left: 0,
        width: '100%',
        textAlign: 'center',
        fontSize: '2.2rem',
        fontWeight: 600,
        color: 'white',
        letterSpacing: '0.02em',
        zIndex: 2,
      }}>
        {safeValue != null ? safeValue.toFixed(2) : 'N/A'}
      </div>
      {/* Label below arc */}
      <div style={{
        marginTop: '18px',
        fontSize: '1.05rem',
        color: '#bdbdbd',
        textAlign: 'center',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>{label}</div>
    </div>
  );
}
// --- End GaugeChart Component ---

// --- Tooltip Component ---
function InfoTooltip({ content, children }) {
  const [isVisible, setIsVisible] = useState(false);
  // const lines = content.split('\n'); // Remove split logic

  console.log('Tooltip Content:', content); // Log the exact content string

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
          top: '-10px', // Position above the icon
          right: '30px', // Position slightly left of the icon
          backgroundColor: '#2d3748', // Darker gray
          color: '#e2e8f0', // Light gray text
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          whiteSpace: 'pre-line', // Use pre-line to handle newlines
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          maxWidth: '250px',
          textAlign: 'left'
        }}>
          {content} {/* Render content directly */}
        </div>
      )}
    </div>
  );
}

// --- Info Icon Component ---
function InfoIcon() {
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

function App() {
// ... existing code ...
}

export default App; 