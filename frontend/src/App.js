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
  // --- Calculate initial date values ---
  const today = new Date();
  const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1); 
  const prevMonthDate = new Date(new Date().setMonth(today.getMonth() - 1)); // Simpler way to get prev month
  const initialYear = prevMonthDate.getFullYear();
  const initialMonthNum = prevMonthDate.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();

  // --- Login State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Added loading state
  // --- State variables for pharmacy restrictions ---
  const [allowedPharmacies, setAllowedPharmacies] = useState([]);
  const [isRestrictedUser, setIsRestrictedUser] = useState(false);

  // --- Hamburger menu state for mobile nav ---
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // --- Existing UI and Data State ---
  const [view, setView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(initialYear); // Now defined
  const [month, setMonth] = useState(initialMonthNum); // Now defined
  
  // Chart colors are now fixed based on dark mode CSS variables
  const [chartColors, setChartColors] = useState({ primary: '#FFA500', secondary: '#4B5563', selected: '#FF4500' });

  // Data state
  const [dailyData, setDailyData] = useState([]);
  const [todayKPIs, setTodayKPIs] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyAgg, setMonthlyAgg] = useState({});
  const [monthlyCumulativeCosts, setMonthlyCumulativeCosts] = useState([]);
  const [stockKPIs, setStockKPIs] = useState({}); // NEW state for stock KPIs
  const [yearlyDailyStockMovements, setYearlyDailyStockMovements] = useState({}); // NEW state for YEARLY stock data
  const [monthlyStockSalesData, setMonthlyStockSalesData] = useState([]); // NEW state for Stock vs Sales chart
  // ** NEW: State for yearly data **
  const [yearlyData, setYearlyData] = useState({}); // Stores { 'YYYY-MM-DD': turnover, ... }
  const [maxYearlyTurnover, setMaxYearlyTurnover] = useState(0); // For color scaling
  const [previousYearlyData, setPreviousYearlyData] = useState({}); // NEW state for previous year daily data
  // ** NEW: State for yearly summary data **
  const [yearlySummaryData, setYearlySummaryData] = useState([]); // Stores [{month: 1, currentTotal: T, previousTotal: P, transactions: X, avgBasketSize: B, yoyGrowth: G}, ...]
  const [calculatedMonthlyTotals, setCalculatedMonthlyTotals] = useState([]); // Stores FE calculation { month, total, previousTotal, yoyGrowth }
  const [adjustedYearlyYoY, setAdjustedYearlyYoY] = useState(null); // NEW state for adjusted YoY KPI

  // Add state for the heatmap max color
  const [heatmapMaxColor, setHeatmapMaxColor] = useState('#FF4500'); // Default to accent primary

  // ** Update yearlyAggregates state initialization **
  const [yearlyAggregates, setYearlyAggregates] = useState({
    current_turnover: 0,
    current_cost_of_sales: 0,
    previous_turnover: 0,
    current_dispensary_turnover: 0,
    current_purchases: 0,
    current_transactions: 0,
    avg_basket_value_reported: 0,
    avg_basket_size_reported: 0
  });

  // --- State for Inventory Value Over Time (18 months) ---
  const [inventoryHistoryData, setInventoryHistoryData] = useState([]);
  // --- State for 18-month turnover data ---
  const [inventoryTurnoverHistory, setInventoryTurnoverHistory] = useState([]);
  const [inventoryTurnoverLoading, setInventoryTurnoverLoading] = useState(false);

  // --- NEW: State for Dashboard Monthly Aggregates ---
  const [dashboardMonthlyAgg, setDashboardMonthlyAgg] = useState({});
  const [monthlyComparisonData, setMonthlyComparisonData] = useState({ current_year_cumulative: [], previous_year_cumulative: [] });

  // State for previous year's summary data
  const [previousYearlySummaryData, setPreviousYearlySummaryData] = useState([]);

  // --- Pharmacy Selector State ---
  const PHARMACY_OPTIONS = [
    { label: 'TLC Reitz', value: 'reitz' },
    { label: 'TLC Villiers', value: 'villiers' },
    { label: 'TLC Roos', value: 'roos' },
    { label: 'TLC Tugela', value: 'tugela' },
    { label: 'TLC Winterton', value: 'winterton' },
  ];
  const [selectedPharmacy, setSelectedPharmacy] = useState(PHARMACY_OPTIONS[0].value);

  // After 'const [selectedPharmacy, setSelectedPharmacy] = useState(PHARMACY_OPTIONS[0].value);'
  const selectedPharmacyLabel = PHARMACY_OPTIONS.find(opt => opt.value === selectedPharmacy)?.label || '';

  // Attach selected pharmacy to all axios requests as a header
  useEffect(() => {
    axios.defaults.headers.common['X-Pharmacy'] = selectedPharmacy;
  }, [selectedPharmacy]);

  // --- Fetch Inventory History Data from new endpoint ---
  useEffect(() => {
    if (view !== 'stock') {
      setInventoryHistoryData([]); // Clear data when leaving stock view
      setInventoryTurnoverHistory([]);
      return;
    }

    const endMonthStr = `${selectedYear}-${String(month).padStart(2, '0')}`;
    const apiUrl = `/api/stock/closing_history?months=18&end=${endMonthStr}`;

    axios.get(apiUrl)
      .then(res => {
        let previousValue = null;
        const history = (res.data || []).map(item => {
          const currentValue = item.closing_stock;
          const change = previousValue !== null ? currentValue - previousValue : null;
          previousValue = currentValue; // Update for next iteration
          return {
            ...item, // includes 'month': 'YYYY-MM'
            label: format(new Date(item.month + '-01T00:00:00'), "MMM ''yy"), // Parse YYYY-MM
            value: currentValue,
            change: change
          };
        });
        setInventoryHistoryData(history);
        // --- Fetch turnover for all 18 months ---
        setInventoryTurnoverLoading(true);
        Promise.all(history.map(entry =>
          axios.get(`/api/month/${entry.month}/aggregates`).then(res => ({
            month: entry.month,
            turnover: res.data?.turnover ?? null
          })).catch(() => ({ month: entry.month, turnover: null }))
        )).then(turnoverResults => {
          setInventoryTurnoverHistory(turnoverResults);
          setInventoryTurnoverLoading(false);
        });
        // --- End fetch turnover ---
      })
      .catch(error => {
        console.error("Error fetching inventory history:", error);
        setInventoryHistoryData([]);
        setInventoryTurnoverHistory([]);
      });

  }, [view, selectedYear, month, selectedPharmacy]);

  // Update chart colors based on CSS variables (run once on mount)
  useEffect(() => {
    setChartColors({
      primary: getCssVar('--accent-primary-focus'), 
      secondary: getCssVar('--chart-bar-default'),   
      selected: getCssVar('--accent-primary')        
    });
    // Also update heatmap color from CSS variable
    setHeatmapMaxColor(getCssVar('--accent-primary'));
  }, []);

  // --- Fetch daily data ONLY when date or view=daily changes ---
  useEffect(() => {
    // Only run for daily view
    if (view !== 'daily') return;

    // Use selectedDate directly
    const fetchDataForSelectedDate = async () => {
      const dateToUse = selectedDate;
      try {
        const year = dateToUse.getUTCFullYear();
        const month = String(dateToUse.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dateToUse.getUTCDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Fetch daily details for KPIs
        console.log(`Fetching daily data for ${dateStr} (View: ${view})`);
        const dailyDataRes = await axios.get(`/api/day/${dateStr}`);
        setDailyData(dailyDataRes.data || []);

        // Fetch monthly context ONLY if in daily view for the bar chart
        if (view === 'daily') {
          const mOfDate = dateStr.slice(0, 7);
          console.log(`Fetching monthly context for ${mOfDate} (Daily View Chart)`);
          const monthlyDataRes = await axios.get(`/api/month/${mOfDate}/turnover`);
          setMonthlyData(monthlyDataRes.data || []);
        } else {
          setMonthlyData([]); // Clear monthly context if not in daily view
        }
      } catch (error) {
        console.error(`Error fetching data for ${selectedDate} (View: ${view}):`, error);
        setDailyData([]);
        setMonthlyData([]);
      }
    };

    fetchDataForSelectedDate();
  }, [view, selectedDate, selectedPharmacy]); // Only depend on view and selectedDate

  // --- Fetch monthly data for MONTHLY view ---
  useEffect(() => {
    if (view !== 'monthly') return;
    
    const year = selectedYear;
    const monthStrPadded = String(month).padStart(2, '0');
    const monthYearStr = `${year}-${monthStrPadded}`;

    axios.get(`/api/month/${monthYearStr}/aggregates`)
        .then(res => setMonthlyAgg(res.data)) // Update MONTHLY view state
        .catch(console.error);
    // ... fetch other monthly view data (comparison, costs, turnover) ...
    axios.get(`/api/month/${monthYearStr}/turnover/comparison`) 
        .then(res => setMonthlyComparisonData(res.data))
        .catch(console.error);
    axios.get(`/api/month/${monthYearStr}/cumulative_costs`)
        .then(res => setMonthlyCumulativeCosts(res.data))
        .catch(console.error);
    axios.get(`/api/month/${monthYearStr}/turnover`) 
        .then(res => {
          setMonthlyData(res.data || []); 
        })
        .catch(error => {
           console.error("Error fetching monthly turnover data for monthly view:", error);
           setMonthlyData([]); 
        });

  }, [view, month, selectedYear, selectedPharmacy]); // Keep dependencies for monthly view

  // --- Fetch monthly aggregates for DASHBOARD view ---
  useEffect(() => {
    if (view !== 'dashboard') {
        setDashboardMonthlyAgg({}); // Clear when leaving dashboard view
        return;
    }

    const year = selectedYear;
    const monthStrPadded = String(month).padStart(2, '0');
    const monthYearStr = `${year}-${monthStrPadded}`;
    
    axios.get(`/api/month/${monthYearStr}/aggregates`)
      .then(res => setDashboardMonthlyAgg(res.data || {}))
      .catch(() => setDashboardMonthlyAgg({}));
    // Fetch yearly summary data for 12-month rolling window chart
    axios.get(`/api/year/${year}/monthly_summaries`)
      .then(res => setYearlySummaryData(res.data || []))
      .catch(() => setYearlySummaryData([]));
    // Fetch previous year's summary data for rolling window
    axios.get(`/api/year/${year - 1}/monthly_summaries`)
      .then(res => setPreviousYearlySummaryData(res.data || []))
      .catch(() => setPreviousYearlySummaryData([]));
  }, [view, selectedYear, month, selectedPharmacy]);

  // --- Compute KPIs from dailyData (no change needed) ---
  useEffect(() => {
    const k = {};
    // Initialize KPIs to null or 0 to avoid showing stale data briefly
    k.turnover = null;
    k.costOfSales = null;
    k.gpValue = null;
    k.gpPercent = null;
    k.purchases = null;
    k.transactions = null;
    k.dispensaryTurnover = null;
    
    dailyData.forEach(e => {
      const desc = e.description ? e.description.toLowerCase().trim() : ''; // Add trim()
      const category = e.category ? e.category.toLowerCase().trim() : ''; // Add trim()
      
      // Improved parsing: Remove anything not a digit or decimal, then parse
      const valueString = String(e.today_value || '0').replace(/[^\d.]/g, '');
      const todayValue = parseFloat(valueString);
      
      // Only process if todayValue is a valid number
      if (!isNaN(todayValue)) {
          if (category === 'turnover summary' && desc.includes('total turnover')) k.turnover = todayValue;
          else if (category === 'stock trading account' && desc === 'cost of sales') k.costOfSales = todayValue;
          else if (category === 'stock trading account' && desc.includes('gross profit (r)')) k.gpValue = todayValue;
          else if (category === 'stock trading account' && desc.includes('gross profit (%)')) k.gpPercent = todayValue;
          else if (category === 'stock trading account' && desc === 'purchases') k.purchases = todayValue;
          else if (category === 'sales summary' && desc === 'pos transactions') k.transactions = todayValue; 
          else if (category === 'dispensary summary' && desc.includes('dispensary') && (desc.includes('turnover') || desc.includes('revenue'))) {
             k.dispensaryTurnover = todayValue;
          }
      }
    });
    setTodayKPIs(k);
  }, [dailyData, selectedPharmacy]);

  // Fetch YEARLY stock movements data AND Stock vs Sales data
  useEffect(() => {
    if (view !== 'stock') return; // Only run for stock view

    // Fetch daily movements for bubble chart
    axios.get(`/api/year/${selectedYear}/daily_stock_movements`)
      .then(res => {
        console.log("Yearly Stock Movements Data:", res.data); // Log fetched data
        setYearlyDailyStockMovements(res.data || {});
      })
      .catch(error => {
        console.error("Error fetching yearly daily stock movements:", error);
        setYearlyDailyStockMovements({}); // Reset on error
      });
      
    // Fetch monthly stock vs sales for area chart
    axios.get(`/api/year/${selectedYear}/monthly_stock_sales`)
      .then(res => {
         setMonthlyStockSalesData(res.data || []);
      })
      .catch(error => {
        console.error("Error fetching monthly stock vs sales:", error);
        setMonthlyStockSalesData([]); // Reset on error
      });

  }, [view, selectedYear, selectedPharmacy]); // Trigger on view change to stock or year change

  // ** Update useEffect for yearly data - Revert to FE calculation **
  useEffect(() => {
    // --- NEW: Prevent fetch if not logged in ---
    if (!isLoggedIn) {
      console.log("Yearly useEffect: Skipping fetch because user is not logged in.");
      // Optionally clear yearly data states here if needed
      setYearlyData({});
      setMaxYearlyTurnover(0);
      setPreviousYearlyData({});
      setCalculatedMonthlyTotals([]);
      setAdjustedYearlyYoY(null);
      setYearlyAggregates({ /* default values */ });
      return; 
    }
    // --- End NEW ---
    
    if (view !== 'yearly' && view !== 'dashboard') {
       setCalculatedMonthlyTotals([]); // Clear calculated totals when leaving
       return;
    }

    const abortController = new AbortController();
    const signal = abortController.signal;

    const processYearlyView = async () => {
      console.log(`Processing Yearly/Dasboard View for ${selectedYear}`);
      try {
        // Fetch daily turnover and aggregates as before, and stock movements for both years
        const [dailyTurnoverRes, aggregatesRes, dailyStockMovementsRes, prevYearStockMovementsRes] = await Promise.all([
            axios.get(`/api/year/${selectedYear}/daily_turnover`, { signal }),
            axios.get(`/api/year/${selectedYear}/aggregates`, { signal }),
            axios.get(`/api/year/${selectedYear}/daily_stock_movements`, { signal }),
            axios.get(`/api/year/${selectedYear - 1}/daily_stock_movements`, { signal }),
        ]);

        // --- NEW: Fetch avg basket value for each month in both years ---
        const monthsToFetch = Array.from({ length: 12 }, (_, i) => i + 1);
        const avgBasketValueFetches = monthsToFetch.map(monthNum => {
          const monthStr = String(monthNum).padStart(2, '0');
          const currentYearMonth = `${selectedYear}-${monthStr}`;
          const prevYearMonth = `${selectedYear - 1}-${monthStr}`;
          return Promise.all([
            axios.get(`/api/month/${currentYearMonth}/aggregates`).then(res => res.data?.avgBasketValueReported || 0).catch(() => 0),
            axios.get(`/api/month/${prevYearMonth}/aggregates`).then(res => res.data?.avgBasketValueReported || 0).catch(() => 0)
          ]);
        });
        const avgBasketValues = await Promise.all(avgBasketValueFetches);

        // Set heatmap data
        const currentYearData = dailyTurnoverRes.data?.current_year || {};
        setYearlyData(currentYearData);
        const turnovers = Object.values(currentYearData).filter(v => v > 0);
        setMaxYearlyTurnover(turnovers.length > 0 ? Math.max(...turnovers) : 0);

        // Set previous year heatmap data
        const prevYearData = dailyTurnoverRes.data?.previous_year || {}; // Get previous year data
        setPreviousYearlyData(prevYearData);

        // --- NEW: Get daily cost of sales and purchases for both years ---
        const dailyStockMovements = dailyStockMovementsRes.data || {}; // { 'YYYY-MM-DD': { purchases, costOfSales } }
        const prevYearStockMovements = prevYearStockMovementsRes.data || {};

        // --- Calculate Monthly Totals AND YoY Growth from Daily Data --- 
        const monthlyTotalsAndYoY = [];
        for (let month = 1; month <= 12; month++) {
            let currentMonthTotal = 0;
            let previousMonthTotal = 0;
            let currentMonthCostOfSales = 0;
            let previousMonthCostOfSales = 0;
            let currentMonthPurchases = 0;
            let previousMonthPurchases = 0;
            const monthStr = String(month).padStart(2, '0'); // Format as '01', '02', etc.
            const currentYearPrefix = `${selectedYear}-${monthStr}-`;
            const previousYearPrefix = `${selectedYear - 1}-${monthStr}-`; // Prefix for previous year
            // Calculate Current Year Total (Turnover)
            Object.entries(currentYearData).forEach(([dateStr, turnover]) => {
                if (dateStr.startsWith(currentYearPrefix)) {
                    currentMonthTotal += (turnover || 0); 
                }
            });
            // Calculate Previous Year Total (Turnover)
            Object.entries(prevYearData).forEach(([dateStr, turnover]) => {
                if (dateStr.startsWith(previousYearPrefix)) {
                    previousMonthTotal += (turnover || 0);
                }
            });
            // Calculate Current Year Cost of Sales and Purchases
            Object.entries(dailyStockMovements).forEach(([dateStr, values]) => {
                if (dateStr.startsWith(currentYearPrefix)) {
                    currentMonthCostOfSales += (values.costOfSales || 0);
                    currentMonthPurchases += (values.purchases || 0);
                }
            });
            // Calculate Previous Year Cost of Sales and Purchases
            Object.entries(prevYearStockMovements).forEach(([dateStr, values]) => {
                if (dateStr.startsWith(previousYearPrefix)) {
                    previousMonthCostOfSales += (values.costOfSales || 0);
                    previousMonthPurchases += (values.purchases || 0);
                }
            });
            // Calculate YoY Growth 
            let yoyGrowth = null; // Use null for N/A initially
            if (previousMonthTotal > 0) {
                yoyGrowth = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
            } else if (currentMonthTotal > 0) {
                yoyGrowth = Infinity; // Indicate growth from zero
            } else if (currentMonthTotal === 0 && previousMonthTotal === 0) {
                yoyGrowth = 0.0; // No change from zero
            }
            // --- Add avg basket value for current and previous year ---
            const [avgBasketValueCurrent, avgBasketValuePrev] = avgBasketValues[month - 1];
            monthlyTotalsAndYoY.push({ 
                month: month, 
                total: currentMonthTotal, 
                previousTotal: previousMonthTotal, // Store previous total if needed later
                costOfSales: currentMonthCostOfSales,
                previousCostOfSales: previousMonthCostOfSales,
                purchases: currentMonthPurchases,
                previousPurchases: previousMonthPurchases,
                yoyGrowth: yoyGrowth,
                avgBasketValueReported: avgBasketValueCurrent,
                avgBasketValueReportedPrev: avgBasketValuePrev
            });
        }
        setCalculatedMonthlyTotals(monthlyTotalsAndYoY); // Update state with new structure
        console.log("Calculated Monthly Totals & YoY (FE):", monthlyTotalsAndYoY);
        // --- End Calculation ---

        // --- Calculate Adjusted Yearly YoY based on Completed Months ---
        const today = new Date();
        const currentMonthIndex = today.getMonth(); // 0-11
        const lastCompletedMonthIndex = currentMonthIndex - 1; // Index of the last fully completed month

        let adjustedCurrentTotal = 0;
        let adjustedPreviousTotal = 0;
        let calculatedAdjustedYoY = null;

        if (lastCompletedMonthIndex >= 0) { // Check if at least one month is completed (i.e., it's not January)
             for(let i = 0; i <= lastCompletedMonthIndex; i++) {
                 if (monthlyTotalsAndYoY[i]) { // Ensure data exists for the month
                     adjustedCurrentTotal += (monthlyTotalsAndYoY[i].total || 0);
                     adjustedPreviousTotal += (monthlyTotalsAndYoY[i].previousTotal || 0);
                 }
             }
             // Calculate YoY based on summed totals for completed months
             if (adjustedPreviousTotal > 0) {
                 calculatedAdjustedYoY = ((adjustedCurrentTotal - adjustedPreviousTotal) / adjustedPreviousTotal) * 100;
             } else if (adjustedCurrentTotal > 0) {
                 calculatedAdjustedYoY = Infinity;
             } else if (adjustedCurrentTotal === 0 && adjustedPreviousTotal === 0) {
                 calculatedAdjustedYoY = 0.0;
             }
        } // If lastCompletedMonthIndex < 0 (it's Jan), calculatedAdjustedYoY remains null (N/A)
        setAdjustedYearlyYoY(calculatedAdjustedYoY);
        console.log(`Adjusted Yearly YoY (up to month ${lastCompletedMonthIndex + 1}):`, calculatedAdjustedYoY); // Log adjusted YoY
        // --- End Adjusted YoY Calculation ---
        // Set KPI data
        setYearlyAggregates(aggregatesRes.data || { /* default values */ });
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log(`Yearly processing aborted for ${selectedYear}:`, error.message);
        } else {
          console.error(`Error processing yearly/dashboard view for ${selectedYear}:`, error);
          setYearlyData({}); setMaxYearlyTurnover(0);
          setYearlyAggregates({ /* default values */ }); 
          setCalculatedMonthlyTotals([]); // Clear on error
        }
      } finally {
         // setLoading(false); 
      }
    };
    processYearlyView();
    // Cleanup function
    return () => {
      console.log(`Cleaning up yearly effect for ${selectedYear}...`);
      abortController.abort();
    };
  }, [view, selectedYear, selectedPharmacy]);

  // Format currency
  const formatCurrency = (value) => value?.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // ** NEW: Format currency in short 'k' format **
  const formatCurrencyShortK = (value) => {
    if (value == null || isNaN(value)) return '';
    if (Math.abs(value) >= 1000) {
      return `R${(value / 1000).toFixed(0)}k`;
    }
    // Optionally show smaller values directly, or leave blank
    // return `R${value.toFixed(0)}`; 
    return ''; // Keep cells with < 1k blank for cleaner look
  };

  // Prepare Donut Chart Data (Monthly)
  const monthlyDonutTotal = (monthlyAgg.dispensaryTurnover || 0) + ((monthlyAgg.turnover || 0) - (monthlyAgg.dispensaryTurnover || 0));
  const monthlyDonutData = [
    { name: 'Dispensary', value: monthlyAgg.dispensaryTurnover || 0 },
    { name: 'Frontshop', value: (monthlyAgg.turnover || 0) - (monthlyAgg.dispensaryTurnover || 0) }, 
  ].filter(d => d.value > 0);

  // Prepare Donut Chart Data (Daily)
  const dailyDonutTotal = (todayKPIs.dispensaryTurnover || 0) + ((todayKPIs.turnover || 0) - (todayKPIs.dispensaryTurnover || 0));
  const dailyDonutData = [
      { name: 'Dispensary', value: todayKPIs.dispensaryTurnover || 0 },
      { name: 'Frontshop', value: (todayKPIs.turnover || 0) - (todayKPIs.dispensaryTurnover || 0) },
  ].filter(d => d.value > 0);
  
  // Updated merge function for TWO CUMULATIVE datasets
  const mergeCumulativeComparisonData = (currentCumulative, previousCumulative) => {
    // Find the last day with data for current year
    const maxDayCurrent = Math.max(...currentCumulative.map(d => d.day), 0);
    const maxDayPrevious = Math.max(...previousCumulative.map(d => d.day), 0);
    const maxDay = Math.max(maxDayCurrent, maxDayPrevious);

    const merged = [];
    let lastCurrentCumulative = 0;
    let lastPreviousCumulative = 0;

    for (let day = 1; day <= maxDay; day++) {
      const currentEntry = currentCumulative.find(d => d.day === day);
      const previousEntry = previousCumulative.find(d => d.day === day);

      // Only carry forward for previous, not for current
      if (currentEntry) {
        lastCurrentCumulative = currentEntry.cumulative_turnover;
      }
      if (previousEntry) {
        lastPreviousCumulative = previousEntry.cumulative_turnover;
      }

      merged.push({
        day: day,
        current_cumulative_turnover: (day <= maxDayCurrent) ? (currentEntry?.cumulative_turnover ?? null) : null,
        previous_cumulative_turnover: previousEntry?.cumulative_turnover ?? lastPreviousCumulative,
      });
    }
    if (maxDay === 0 && currentCumulative.length === 0 && previousCumulative.length === 0) {
        return [];
    }
    return merged;
  };

  // Use the updated merge function with data from the single API call
  const processedMonthlyCumulativeComparison = mergeCumulativeComparisonData(
    monthlyComparisonData.current_year_cumulative || [], 
    monthlyComparisonData.previous_year_cumulative || []
  );

  // ** NEW: Handlers for individual date component dropdowns **
  const handleYearChange = (newYear) => {
    const year = parseInt(newYear, 10);
    const monthIndex = selectedDate.getUTCMonth();
    let day = selectedDate.getUTCDate();
    
    // Adjust day if it exceeds the number of days in the new month/year
    // Use getDaysInMonth with a UTC date object
    const daysInMonth = getDaysInMonth(new Date(Date.UTC(year, monthIndex))); 
    if (day > daysInMonth) {
      day = daysInMonth;
    }
    
    setSelectedDate(new Date(Date.UTC(year, monthIndex, day)));
  };

  const handleMonthChange = (newMonthIndex) => {
    const monthIndex = parseInt(newMonthIndex, 10);
    const year = selectedDate.getUTCFullYear();
    let day = selectedDate.getUTCDate();

    // Adjust day if it exceeds the number of days in the new month
    // Use getDaysInMonth with a UTC date object
    const daysInMonth = getDaysInMonth(new Date(Date.UTC(year, monthIndex)));
    if (day > daysInMonth) {
      day = daysInMonth;
    }

    setSelectedDate(new Date(Date.UTC(year, monthIndex, day)));
  };

  const handleDayChange = (newDay) => {
    const day = parseInt(newDay, 10);
    const year = selectedDate.getUTCFullYear();
    const monthIndex = selectedDate.getUTCMonth();
    
    setSelectedDate(new Date(Date.UTC(year, monthIndex, day)));
  };

  // ** NEW: Helper function for color interpolation **
  const interpolateColor = (value, maxValue, colorZeroHex, colorMaxHex) => {
    if (maxValue <= 0 || value <= 0) return colorZeroHex; // Handle zero/negative max or value
    const ratio = Math.min(value / maxValue, 1.0); // Clamp ratio to max 1.0

    // Simple hex to RGB converter
    const hexToRgb = (hex) => {
      const bigint = parseInt(hex.slice(1), 16);
      return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
    };

    const colorZero = hexToRgb(colorZeroHex);
    const colorMax = hexToRgb(colorMaxHex);

    // Linear interpolation
    const r = Math.round(colorZero.r + (colorMax.r - colorZero.r) * ratio);
    const g = Math.round(colorZero.g + (colorMax.g - colorZero.g) * ratio);
    const b = Math.round(colorZero.b + (colorMax.b - colorZero.b) * ratio);

    // RGB to Hex
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  };

  // ** Prepare Donut Chart Data (Yearly) **
  const yearlyTotalTurnover = yearlyAggregates.current_turnover || 0;
  const yearlyDispensary = yearlyAggregates.current_dispensary_turnover || 0;
  const yearlyFrontshop = yearlyTotalTurnover - yearlyDispensary;

  const yearlyDonutData = [
    { name: 'Dispensary', value: yearlyDispensary },
    { name: 'Frontshop', value: yearlyFrontshop }, 
  ].filter(d => d.value > 0);

  // --- Calculate Inventory to Sales Ratio ---
  // Formula: Inventory to Sales Ratio = Average Inventory / Net Sales (monthly sales)
  // Use average of opening and closing stock for Average Inventory
  // Use monthlyAgg.turnover for Net Sales
  let inventoryToSalesRatio = null;
  const openingStock = stockKPIs.opening_stock;
  const closingStock = stockKPIs.closing_stock;
  // Calculate netSales using the fetched monthly aggregate turnover
  const netSales = monthlyAgg?.turnover; // Use optional chaining
  // Debug log before calculation
  console.log('DEBUG InvSalesRatio Calc:', { 
      view, 
      openingStock, 
      closingStock, 
      monthlyAggTurnover: netSales, 
      stockKPIs, 
      monthlyAgg 
  }); 

  if (
    typeof openingStock === 'number' &&
    typeof closingStock === 'number' &&
    typeof netSales === 'number' && // Check netSales from monthlyAgg
    netSales > 0
  ) {
    const avgInventory = (openingStock + closingStock) / 2;
    inventoryToSalesRatio = avgInventory / netSales;
  }
  // Debug log for Inventory to Sales Ratio calculation (Keep for verification)
  console.log('DEBUG InventoryToSalesRatio Result:', inventoryToSalesRatio);

  // --- Chart color assignments for all dashboards ---
  const CHART_GRID_COLOR = '#374151';      // Subtle grid line (gray-700)
  const CHART_AXIS_COLOR = '#bdbdbd';      // Axis label color (light gray)
  const CHART_BAR_PRIMARY = COLOR_CHARTREUSE; // Chartreuse for inventory bars

  // 1. Prepare inventory+turnover data for the 18-month window (robust month matching)
  const turnoverLookup = {};
  inventoryTurnoverHistory.forEach((entry) => {
    turnoverLookup[entry.month] = entry.turnover;
  });
  const inventoryAndTurnoverHistory = inventoryHistoryData.map((item) => {
    return {
      ...item,
      turnover: turnoverLookup[item.month] ?? null
    };
  });

  // Custom tick formatter to show every third month
  const everyThirdMonthTick = (label, index) => (index % 3 === 0 ? label : '');

  // --- State for Custom Alert ---
  const [alertInfo, setAlertInfo] = useState({ isVisible: false, message: '', type: 'info' });
  // --- State for Latest Data Date ---
  const [latestDataDate, setLatestDataDate] = useState('...'); // Initial placeholder

  // --- Handler for Update Button ---
  async function handleUpdateClick() {
    setAlertInfo({ isVisible: true, message: 'Triggering update... Please wait.', type: 'info' });
    try {
      const response = await axios.post('/api/fetch_reports');
      const latestDate = response.data?.latest_date;
      const newDaysCount = response.data?.new_days_count;

      // Update latest date state if available
      if (latestDate && latestDate !== 'N/A') {
        setLatestDataDate(latestDate); 
      }

      // Construct message based on count and date
      let successMessage = 'Update process completed.'; // Default message
      if (typeof newDaysCount === 'number' && latestDate && latestDate !== 'N/A') {
          const daysText = newDaysCount === 1 ? 'Day' : 'Days';
          successMessage = `${newDaysCount} ${daysText} added. Dataset now updated until ${latestDate}.`;
      } else if (latestDate && latestDate !== 'N/A') {
          // Fallback if count isn't available (e.g., 0 days added but fetch was ok)
          successMessage = `Dataset already up-to-date (${latestDate}).`; 
      }

      setAlertInfo({ isVisible: true, message: successMessage, type: 'success' });
    } catch (error) {
      // ... (error handling remains the same) ...
      const errorMessage = error?.response?.data?.error || error.message || 'Unknown error';
      setAlertInfo({ isVisible: true, message: `Update failed: ${errorMessage}`, type: 'error' });
    }

    // Auto-hide after a few seconds
    setTimeout(() => {
      setAlertInfo(currentAlertInfo => ({ ...currentAlertInfo, isVisible: false }));
    }, 5000);
  }

  // Fetch latest available date on initial load
  useEffect(() => {
    axios.get('/api/latest_date')
      .then(res => {
        if (res.data?.latest_date && res.data.latest_date !== 'N/A') {
          setLatestDataDate(res.data.latest_date);
        }
      })
      .catch(err => {
        console.error("Error fetching latest date:", err);
        setLatestDataDate('Error'); // Indicate error fetching date
      });
  }, [selectedPharmacy]); // Run only once on mount

  // --- Fetch Stock KPIs AND Monthly Aggregates for STOCK view ---
  useEffect(() => {
    if (view !== 'stock') {
      setStockKPIs({}); // Clear when leaving stock view
      setMonthlyAgg({}); // Clear aggregates too
      return;
    }

    const year = selectedYear;
    const monthStrPadded = String(month).padStart(2, '0');
    const monthYearStr = `${year}-${monthStrPadded}`;

    // Fetch both datasets
    const fetchStockData = axios.get(`/api/month/${monthYearStr}/stock_kpis`);
    const fetchAggData = axios.get(`/api/month/${monthYearStr}/aggregates`);

    console.log(`Fetching stock KPIs and aggregates for Stock view: ${monthYearStr}`);
    Promise.all([fetchStockData, fetchAggData])
      .then(([stockRes, aggRes]) => {
        console.log("--- DEBUG: Stock KPIs received for Stock View:", stockRes.data);
        setStockKPIs(stockRes.data || {});
        
        console.log("--- DEBUG: Monthly Aggregates received for Stock View Ratio Calc:", aggRes.data);
        setMonthlyAgg(aggRes.data || {}); // Use the monthlyAgg state
      })
      .catch(error => {
        console.error(`Error fetching stock data/aggregates for ${monthYearStr}:`, error);
        setStockKPIs({}); 
        setMonthlyAgg({}); // Clear on error
      });
      
  }, [view, month, selectedYear, selectedPharmacy]); // Depend on stock view, month, year

  // --- Fetch YEARLY stock movements data AND Stock vs Sales data (for Stock view charts) ---
  useEffect(() => {
    if (view !== 'stock') return; // Only run for stock view

    // ... (existing logic for fetching yearly stock movements and monthly stock sales) ...

  }, [view, selectedYear, selectedPharmacy]); // Trigger on view change to stock or year change

  // --- Helper: Generate last 12 (year, month) pairs ending with selected year/month ---
  function getLast12Months(year, month) {
    const result = [];
    let y = year;
    let m = month;
    for (let i = 0; i < 12; i++) {
      result.unshift({ year: y, month: m });
      m--;
      if (m === 0) { m = 12; y--; }
    }
    return result;
  }

  // --- Fetch and build 12-month rolling window for dashboard (NOW USES NEW ENDPOINT) ---
  const [dashboardRolling12MonthsData, setDashboardRolling12MonthsData] = useState([]);

  useEffect(() => {
    if (view !== 'dashboard' || !isLoggedIn) {
      setDashboardRolling12MonthsData([]); // Clear data if not on dashboard or not logged in
      return;
    }
    
    // Fetch combined data from the new endpoint
    const url = `/api/dashboard/rolling_window?year=${selectedYear}&month=${month}`;
    console.log("Fetching rolling window data from:", url); // Log the URL
    
    axios.get(url)
      .then(res => {
        console.log("Received rolling window data:", res.data);
        const processedData = (res.data || []).map(monthlyData => ({
          // Format data for the charts
          label: format(new Date(monthlyData.month + '-01T00:00:00'), "MMM ''yy"), // Parse YYYY-MM
          total: monthlyData.turnover,
          avgBasketValueReported: monthlyData.avgBasketValueReported,
          costOfSales: monthlyData.costOfSales,
          purchases: monthlyData.purchases
        }));
        setDashboardRolling12MonthsData(processedData);
      })
      .catch(error => {
        console.error("Error fetching rolling window data:", error);
        setDashboardRolling12MonthsData([]); // Clear data on error
      });

  // Dependencies: view, selected year/month, pharmacy (to trigger refetch if pharmacy changes), and loggedIn status
  }, [view, selectedYear, month, selectedPharmacy, isLoggedIn]); 

  // --- Helper: Build 12-month rolling window for cost of sales and purchases --- 
  // REMOVED: This logic is now handled by processing dashboardRolling12MonthsData directly
  /*
  const dashboardRolling12MonthsCostOfSales = (() => {
    // ... old calculation logic ... 
  })();
  */

  {/* --- 12-Month Rolling Window Bar Charts Row --- */}
  <div className="charts-row" style={{ marginTop: 'var(--gap-cards)' }}>
    {/* Turnover Chart */}
    <div className="chart-container" style={{ flex: 1, minWidth: 320 }}>
      <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Monthly Turnover (Last 12 Months)</h3>
      <ResponsiveContainer width="100%" height={220}>
        {/* UPDATE: Use dashboardRolling12MonthsData for ComposedChart */}
        {Array.isArray(dashboardRolling12MonthsData) && dashboardRolling12MonthsData.length > 0 ? (
          <ComposedChart data={dashboardRolling12MonthsData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
            <XAxis 
              dataKey="label" 
              interval={0} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px', angle: -30, textAnchor: 'end'}} 
            />
            <YAxis 
              yAxisId="left"
              tickFormatter={value => `R${(value/1000000).toFixed(1)}M`} // Format as Millions
              width={50} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px'}} 
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={[0, 'dataMax']}
              tickFormatter={value => value ? `R${Math.round(value)}` : ''}
              width={60}
              tickLine={false}
              axisLine={false}
              tick={{ fill: COLOR_ELECTRIC_PURPLE, fontSize: '10px'}}
              // label removed
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ 
                  backgroundColor: getCssVar('--chart-tooltip-bg'), 
                  borderColor: getCssVar('--border-color'),
                  borderRadius: '0.375rem'
              }}
              itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
              labelStyle={{ color: CHART_AXIS_COLOR }}
              formatter={(value, name) => {
                if (name === 'Avg Basket Value') return [formatCurrency(value), 'Avg Basket Value'];
                if (name === 'Total Turnover') return [formatCurrency(value), 'Total Turnover'];
                return [formatCurrency(value), name];
              }}
            />
            <Bar yAxisId="left" dataKey="total" name="Total Turnover">
              {/* UPDATE: Map over dashboardRolling12MonthsData */}
              {dashboardRolling12MonthsData.map((entry, idx) => (
                  <Cell
                      key={`cell-dash-rolling12-${entry.label}`}
                      fill={COLOR_COQUELICOT} 
                      radius={[4, 4, 0, 0]} 
                  />
              ))}
            </Bar>
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="avgBasketValueReported" 
              name="Avg Basket Value" 
              stroke={COLOR_WHITE} 
              strokeWidth={4}
              dot={false}
              activeDot={false}
            />
            <Legend />
          </ComposedChart>
        ) : (
          <div style={{ color: CHART_AXIS_COLOR, textAlign: 'center', paddingTop: '5rem' }}>Loading chart data...</div>
        )}
      </ResponsiveContainer>
    </div>
    {/* Cost of Sales Chart (now LineChart) */}
    <div className="chart-container" style={{ flex: 1, minWidth: 320 }}>
      <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Cost of Sales & Purchases (Last 12 Months)</h3>
      <ResponsiveContainer width="100%" height={220}>
         {/* UPDATE: Use dashboardRolling12MonthsData for LineChart */}
        {Array.isArray(dashboardRolling12MonthsData) && dashboardRolling12MonthsData.length > 0 ? (
          <LineChart data={dashboardRolling12MonthsData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
            <XAxis 
              dataKey="label" 
              interval={0} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px', angle: -30, textAnchor: 'end'}} 
            />
            <YAxis 
              tickFormatter={value => `R${(value/1000000).toFixed(1)}M`} // Format as Millions
              width={50} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px'}} 
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ 
                  backgroundColor: getCssVar('--chart-tooltip-bg'), 
                  borderColor: getCssVar('--border-color'),
                  borderRadius: '0.375rem'
              }}
              itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
              labelStyle={{ color: CHART_AXIS_COLOR }}
              formatter={(value, name) => [formatCurrency(value), name === 'costOfSales' ? 'Cost of Sales' : 'Purchases']} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="costOfSales" 
              name="Cost of Sales" 
              stroke={COLOR_GOLD} 
              strokeWidth={3}
              dot={false}
              activeDot={false}
            />
            <Line 
              type="monotone" 
              dataKey="purchases" 
              name="Purchases" 
              stroke={COLOR_ELECTRIC_PURPLE} 
              strokeWidth={3}
              dot={false}
              activeDot={false}
            />
          </LineChart>
        ) : (
          <div style={{ color: CHART_AXIS_COLOR, textAlign: 'center', paddingTop: '5rem' }}>Loading chart data...</div>
        )}
      </ResponsiveContainer>
    </div>
  </div>
  {/* End 12-Month Rolling Window Bar Charts Row */}

  {/* --- Avg Basket Value 12-Month Rolling Line Chart --- */}
  <div className="chart-container" style={{ marginTop: 'var(--gap-cards)' }}>
    <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Avg Basket Value (Last 12 Months)</h3>
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={dashboardRolling12MonthsData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
        <XAxis 
          dataKey="label" 
          interval={0} 
          tickLine={false} 
          axisLine={false} 
          tick={{ fill: COLOR_ELECTRIC_PURPLE, fontSize: '12px', angle: -30, textAnchor: 'end'}} 
        />
        <YAxis 
          domain={[0, 'dataMax']}
          tickFormatter={value => `R${(value/1000000).toFixed(1)}M`}
          width={65}
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_ELECTRIC_PURPLE, fontSize: '12px'}}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{ 
              backgroundColor: getCssVar('--chart-tooltip-bg'), 
              borderColor: getCssVar('--border-color'),
              borderRadius: '0.375rem'
          }}
          itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
          labelStyle={{ color: COLOR_ELECTRIC_PURPLE }}
          formatter={(value) => [formatCurrency(value), 'Avg Basket Value']} 
        />
        <Line 
          type="monotone" 
          dataKey="avgBasketValueReported" 
          name="Avg Basket Value" 
          stroke={COLOR_ELECTRIC_PURPLE} 
          strokeWidth={4}
          dot={false}
          activeDot={false}
        />
        <Legend 
          verticalAlign="bottom" 
          iconType="circle" 
          wrapperStyle={{ fontSize: '1.1rem', color: COLOR_ELECTRIC_PURPLE, paddingTop: 10 }} 
        />
      </LineChart>
    </ResponsiveContainer>
  </div>

  // --- Fetch monthly turnover data for DASHBOARD view (for daily turnover bar chart) ---
  // REMOVE: This useEffect is no longer needed for the rolling window
  /*
  useEffect(() => {
    if (view !== 'dashboard') return;
    const year = selectedYear;
    const monthStrPadded = String(month).padStart(2, '0');
    const monthYearStr = `${year}-${monthStrPadded}`;
    axios.get(`/api/month/${monthYearStr}/turnover`)
      .then(res => setMonthlyData(res.data || []))
      .catch(error => {
        console.error("Error fetching monthly turnover data for dashboard view:", error);
        setMonthlyData([]);
      });
  }, [view, selectedYear, month, selectedPharmacy]);
  */

  // --- Check Authentication Status on Load ---
    // --- Check Authentication Status on Load ---
  useEffect(() => {
    setIsLoadingAuth(true);
    axios.get('/api/check_auth') // Use relative path if proxy is set
      .then(res => {
        if (res.data.isLoggedIn) {
          const loggedInUsername = res.data.username;
          const allowed = res.data.allowed_pharmacies || [];
          console.log("Auth Check Response:", res.data); // Log response

          setIsLoggedIn(true);
          setCurrentUser(loggedInUsername);
          setAllowedPharmacies(allowed);

          // --- UPDATED: Explicitly check username for restriction ---
          if (loggedInUsername === 'Mauritz' || loggedInUsername === 'Elani') {
            console.log(`User ${loggedInUsername} identified as restricted.`);
            // Set restriction *first*
            setIsRestrictedUser(true);
            // Then force the pharmacy selection if appropriate
            if (allowed.length === 1 && allowed[0] === 'villiers') {
                 console.log(`Forcing pharmacy to 'villiers' for restricted user ${loggedInUsername}.`);
                 setSelectedPharmacy('villiers');
            } else {
                // Handle edge case: restricted user has unexpected allowed list
                console.warn(`User ${loggedInUsername} is restricted but allowed list is not just ['villiers']:`, allowed);
                const currentSelection = selectedPharmacy; // Capture current selection before potential change
                const fallback = allowed.length > 0 ? allowed[0] : PHARMACY_OPTIONS[0].value;
                if (!allowed.includes(currentSelection)) {
                    console.log(`Current selection ${currentSelection} invalid for restricted user ${loggedInUsername}. Resetting to ${fallback}`);
                    setSelectedPharmacy(fallback);
                } else {
                     console.log(`Keeping valid pharmacy ${currentSelection} for restricted user ${loggedInUsername}`);
                }
            }
          } else {
            // User is Charl, Anmarie, or potentially others - NOT restricted
            console.log(`User ${loggedInUsername} identified as unrestricted.`);
             // Set restriction *first*
            setIsRestrictedUser(false);
            const currentSelection = selectedPharmacy; // Capture current selection
            const defaultPharmacy = allowed.length > 0 ? allowed[0] : PHARMACY_OPTIONS[0].value;
            // Check if current selection is valid for unrestricted user after setting state
            if ((allowed.length > 0 && !allowed.includes(currentSelection)) || (allowed.length === 0 && loggedInUsername)) {
                 console.log(`Current selection ${currentSelection} invalid for unrestricted user ${loggedInUsername}. Resetting to default: ${defaultPharmacy}`);
                 setSelectedPharmacy(defaultPharmacy);
            } else {
                 console.log(`Keeping valid pharmacy ${currentSelection} for unrestricted user ${loggedInUsername}`);
            }
          }
          // --- End UPDATED ---

        } else {
          // User is not logged in
          console.log("Auth Check Response: Not Logged In");
          setIsLoggedIn(false);
          setCurrentUser(null);
          setAllowedPharmacies([]); // Clear restrictions on logout
          setIsRestrictedUser(false);
          // Optionally reset pharmacy selection on logout?
          // setSelectedPharmacy(PHARMACY_OPTIONS[0].value);
        }
      })
      .catch(err => {
        console.error("Auth check failed:", err);
        setIsLoggedIn(false); // Assume not logged in on error
        setCurrentUser(null);
        setAllowedPharmacies([]); // Clear restrictions on error
        setIsRestrictedUser(false);
      })
      .finally(() => {
        setIsLoadingAuth(false); // Finished loading auth status
      });
  // Dependency array is empty: run only once on mount
  }, []);

  // --- Login/Logout Handlers ---
  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError(''); // Clear previous errors
    setIsLoadingAuth(true); // Show loading indicator during login process
    try {
      const loginResponse = await axios.post('/api/login', { 
          username: loginUsername, 
          password: loginPassword 
      });

      if (loginResponse.status === 200) {
        // Login successful, now immediately fetch auth details
        console.log("Login POST successful. Fetching auth details...");
        try {
          const authResponse = await axios.get('/api/check_auth');
          console.log("Auth Check Response (after login):", authResponse.data);

          if (authResponse.data && authResponse.data.isLoggedIn) {
            const loggedInUsername = authResponse.data.username;
            const allowed = authResponse.data.allowed_pharmacies || [];
            
            // Set all states together AFTER getting auth info
            setAllowedPharmacies(allowed);
            setCurrentUser(loggedInUsername);
            
            // Determine restriction and set related state
            let restrictUser = false;
            let defaultRestrictedPharmacy = null;

            // --- ADJUSTMENT: Only Mauritz/Elani are strictly 'restricted' (dropdown disabled) ---
            if (loggedInUsername === 'Mauritz' || loggedInUsername === 'Elani') {
              console.log(`User ${loggedInUsername} identified as strictly restricted (dropdown disabled).`);
              restrictUser = true;
              if (allowed.length === 1 && allowed[0] === 'villiers') {
                 defaultRestrictedPharmacy = 'villiers';
              } else {
                 console.warn(`Mauritz/Elani allowed list != ['villiers']:`, allowed);
                 defaultRestrictedPharmacy = allowed.length > 0 ? allowed[0] : PHARMACY_OPTIONS[0].value; // Fallback
              }
            } else {
              // Lize, Charl, Anmarie, etc. are not strictly restricted (dropdown enabled)
              console.log(`User ${loggedInUsername} identified as not strictly restricted (dropdown enabled).`);
              restrictUser = false;
            }
            // --- End ADJUSTMENT ---

            // Set restriction state (only true for Mauritz/Elani now)
            setIsRestrictedUser(restrictUser);

            // Set selected pharmacy based on restriction
            if (restrictUser) {
                console.log(`Setting pharmacy to ${defaultRestrictedPharmacy} for restricted user ${loggedInUsername}.`);
                setSelectedPharmacy(defaultRestrictedPharmacy);
            } else {
                 // Ensure selected pharmacy is valid for unrestricted user
                 const currentSelection = selectedPharmacy; // Capture current selection
                 const defaultUnrestricted = allowed.length > 0 ? allowed[0] : PHARMACY_OPTIONS[0].value;
                 if (!allowed.includes(currentSelection) && allowed.length > 0) { // Check allowed length > 0
                    console.log(`Current selection ${currentSelection} invalid for unrestricted user ${loggedInUsername}. Resetting to default: ${defaultUnrestricted}`);
                    setSelectedPharmacy(defaultUnrestricted);
                 } else {
                     console.log(`Keeping pharmacy ${currentSelection} for unrestricted user ${loggedInUsername}`);
                 }
            }

            // Finally, set loggedIn and clear form
            setIsLoggedIn(true); 
            setLoginUsername('');
            setLoginPassword('');

          } else {
             // This case should ideally not happen if login succeeded, but handle it defensively
             console.error("Login succeeded but check_auth failed or reported not logged in.");
             setLoginError('Login verification failed. Please try again.');
             setIsLoggedIn(false);
             setCurrentUser(null);
             setAllowedPharmacies([]);
             setIsRestrictedUser(false);
          }
        } catch (authError) {
           console.error("Failed to fetch auth details after login:", authError);
           setLoginError('Login verification failed. Please try again.');
           setIsLoggedIn(false);
           setCurrentUser(null);
           setAllowedPharmacies([]);
           setIsRestrictedUser(false);
        }
      } 
      // No explicit else needed for loginResponse.status != 200, as axios throws for non-2xx

    } catch (error) {
      console.error("Login failed:", error);
      setIsLoggedIn(false);
      setCurrentUser(null);
      setAllowedPharmacies([]); // Clear restrictions on login fail
      setIsRestrictedUser(false);
      if (error.response && error.response.data && error.response.data.error) {
        setLoginError(error.response.data.error);
      } else {
        setLoginError('Login failed. Please try again.');
      }
    } finally {
        setIsLoadingAuth(false); // Hide loading indicator
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
      setIsLoggedIn(false);
      setCurrentUser(null);
      // Reset view or other state if needed
      setView('dashboard'); 
    } catch (error) {
      console.error("Logout failed:", error);
      // Handle logout error if needed (e.g., show message)
    }
  };

  // --- Existing Helper Functions & Data Preparation ---
  // ... (formatCurrency, donut data, rolling window helpers, etc.)

  // --- Conditional Rendering --- 

  // Show loading indicator while checking auth status
  if (isLoadingAuth) {
    return <div className="loading-container">Checking authentication...</div>; 
  }

  if (!isLoggedIn) {
    // --- Render TLC Brand Login Card with image background ---
    return (
      <div className="session">
        <div className="login-center-wrapper">
          <form className="log-in" autoComplete="off" onSubmit={e => { e.preventDefault(); handleLoginSubmit(e); }}>
            <div className="login-welcome">
              <div className="login-title-main">Welcome back</div>
              <div className="login-title-sub">Login to view the dashboard</div>
            </div>
            <div className="form-group">
              <label htmlFor="username">Username:</label>
              <input 
                placeholder="Username" 
                type="text" 
                name="username" 
                id="username" 
                autoComplete="off"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password:</label>
              <input 
                placeholder="Password" 
                type="password" 
                name="password" 
                id="password" 
                autoComplete="off"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
              />
            </div>
            {loginError && <p className="login-error">{loginError}</p>}
            <button type="submit" className="button login-button">Log in</button>
          </form>
        </div>
      </div>
    );
  }

  // --- Render Main Dashboard (Only if logged in) --- 
  return (
    <div className="dashboard-container">
      {/* --- Custom Alert Box --- */}
      {alertInfo.isVisible && (
        <div className={`custom-alert alert-${alertInfo.type}`}>
          {alertInfo.message}
          <button 
            className="alert-close-button" 
            onClick={() => setAlertInfo({ ...alertInfo, isVisible: false })}
          >
            &times;
          </button>
        </div>
      )}
      {/* --- End Custom Alert Box --- */}

      <header className="dashboard-header">
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
           {/* ... logo and title ... */}
           <img 
            src="/the-local-choice-logo.png" 
            alt="TLC Logo" 
            style={{ height: '60px' }}
          />
          {/* Find the label for the selected pharmacy */}
          <h2 style={{ marginTop: '1.2rem' }}>{selectedPharmacyLabel}</h2>
         </div>
         {/* Hamburger icon for mobile */}
         <button
           className="hamburger-menu-btn"
           aria-label="Open navigation menu"
           onClick={() => setMobileNavOpen(v => !v)}
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
           {/* ... existing nav content ... */}
           <select
              value={selectedPharmacy}
              onChange={e => setSelectedPharmacy(e.target.value)}
              disabled={isRestrictedUser}
              style={{
                marginRight: '0.75rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                background: '#232b3b',
                color: '#fff',
                border: '1px solid #374151',
                cursor: isRestrictedUser ? 'not-allowed' : 'pointer',
                opacity: isRestrictedUser ? 0.6 : 1
              }}
            >
              {(allowedPharmacies.length > 0
                ? PHARMACY_OPTIONS.filter(opt => allowedPharmacies.includes(opt.value))
                : PHARMACY_OPTIONS
              ).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
                onClick={() => setView('dashboard')}
                className={`button button-primary ${view === 'dashboard' ? 'active' : ''}`}>
                Dashboard 
            </button>
            <button
                onClick={() => setView('monthly')}
                className={`button button-primary ${view === 'monthly' ? 'active' : ''}`}>
                Monthly
            </button>
            <button
                onClick={() => setView('yearly')}
                className={`button button-primary ${view === 'yearly' ? 'active' : ''}`}>
                Yearly
            </button>
            <button
                onClick={() => setView('stock')}
                className={`button button-primary ${view === 'stock' ? 'active' : ''}`}>
                Stock
            </button>
            <div className="update-button-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleUpdateClick}
                className="button button-update" 
              >
                Update
              </button>
              <button
                onClick={handleLogout}
                className="button button-primary button-logout" 
              >
                Logout ({currentUser})
              </button>
            </div>
         </nav>
         {/* Mobile nav overlay background */}
         {mobileNavOpen && <div className="mobile-nav-overlay" onClick={() => setMobileNavOpen(false)}></div>}
      </header>

      {/* NEW: Status Text Positioned Below Header */}
      <div style={{ width: '100%', textAlign: 'right', marginTop: '-8px' }}> {/* Increased negative marginTop */}
        <span className="update-status-text">
          Updated to: {latestDataDate}
        </span>
      </div>

      {/* --- NEW: Dashboard View Section --- */}
      {view === 'dashboard' && (
        <section className="dashboard-view-section" style={{ padding: 'var(--padding-section-md) 0' }}>
          {/* Updated Selectors: Year and Month Only */}
          <div className="month-selector-container" style={{ marginBottom: 'var(--gap-cards)' }}>
             <div className="year-selector">
                <label htmlFor="dash-year-select">Year:</label>
                <select 
                  id="dash-year-select"
                  className="input" 
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                >
                  {[...Array(5)].map((_, i) => {
                    const yearOption = currentYear - i;
                    return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                  }).reverse()}
                </select>
             </div>
             <div className="month-buttons">
               {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthName, index) => {
                 const monthNumber = index + 1;
                 const isSelectedMonth = month === monthNumber;
                 return (
                   <button 
                     key={monthName}
                     onClick={() => setMonth(monthNumber)}
                     className={`button button-month ${isSelectedMonth ? 'active' : ''}`}
                   >
                     {monthName}
                   </button>
                 );
               })}
             </div>
           </div>

          {/* Updated KPI Row (using dashboardMonthlyAgg) */}
          <div className="kpis-grid kpis-grid--dashboard" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--gap-cards)' }}>
            {/* Removed Transactions KPI card */}
            <div className="kpi-card">
              <div className="kpi-label">Turnover</div>
              <div className="kpi-value kpi-value--accent">{formatCurrency(dashboardMonthlyAgg.turnover) || '-'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Gross Profit %</div>
              <div className="kpi-value">{dashboardMonthlyAgg.turnover ? ((dashboardMonthlyAgg.turnover - dashboardMonthlyAgg.costOfSales) / dashboardMonthlyAgg.turnover * 100).toFixed(1) : '0.0'}%</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Gross Profit Value</div>
              <div className="kpi-value">{formatCurrency(dashboardMonthlyAgg.turnover - dashboardMonthlyAgg.costOfSales) || '-'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Cost of Sales</div>
              <div className="kpi-value">{formatCurrency(dashboardMonthlyAgg.costOfSales) || '-'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Purchases </div>
              <div className="kpi-value">{formatCurrency(dashboardMonthlyAgg.purchases) || '-'}</div>
            </div>
          </div>

          {/* --- Secondary KPI Row (3 cards) --- */}
          <div className="kpis-grid kpis-grid--dashboard-secondary" style={{ marginBottom: '0.5rem' }}>
            <div className="kpi-card">
            <div className="kpi-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: '1.1rem', color: '#bdbdbd' }}>Total Transactions Qty</span>
                <span style={{ fontWeight: 600, color: 'white', fontSize: '1.7rem' }}>{dashboardMonthlyAgg.transactions != null ? dashboardMonthlyAgg.transactions.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</span>
                <span style={{ fontSize: '1.1rem', color: '#bdbdbd' }}>Total Scripts Qty</span>
                <span style={{ fontWeight: 600, color: 'white', fontSize: '1.7rem' }}>{dashboardMonthlyAgg.totalScripts != null ? dashboardMonthlyAgg.totalScripts.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</span>
              </div>
            </div>
            <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <GaugeChart
                value={
                  (typeof dashboardMonthlyAgg.dispensaryTurnover === 'number' && typeof dashboardMonthlyAgg.turnover === 'number' && dashboardMonthlyAgg.turnover > 0)
                    ? (dashboardMonthlyAgg.dispensaryTurnover / dashboardMonthlyAgg.turnover) * 100
                    : 0
                }
                max={100}
                color={COLOR_CHARTREUSE}
                label={"Dispensary %"}
              />
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: '1.1rem', color: '#bdbdbd' }}>Avg Basket Size</span>
                <span style={{ fontWeight: 600, color: 'white', fontSize: '1.7rem' }}>{dashboardMonthlyAgg.avgBasketSizeReported != null ? dashboardMonthlyAgg.avgBasketSizeReported.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '-'}</span>
                <span style={{ fontSize: '1.1rem', color: '#bdbdbd', marginTop: 6 }}>Avg Basket Value</span>
                <span style={{ fontWeight: 600, color: 'white', fontSize: '1.7rem' }}>{dashboardMonthlyAgg.avgBasketValueReported != null ? formatCurrency(dashboardMonthlyAgg.avgBasketValueReported) : '-'}</span>
              </div>
            </div>
          </div>

          {/* --- 12-Month Rolling Window Bar Charts Row --- */}
          <div className="charts-row" style={{ marginTop: 'var(--gap-cards)' }}>
            {/* Turnover Chart */}
            <div className="chart-container" style={{ flex: 1, minWidth: 320 }}>
              <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Monthly Turnover (Last 12 Months)</h3>
              <ResponsiveContainer width="100%" height={220}>
                {/* UPDATE: Use dashboardRolling12MonthsData for ComposedChart */}
                {Array.isArray(dashboardRolling12MonthsData) && dashboardRolling12MonthsData.length > 0 ? (
                  <ComposedChart data={dashboardRolling12MonthsData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                    <XAxis 
                      dataKey="label" 
                      interval={0} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px', angle: -30, textAnchor: 'end'}} 
                    />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={value => `R${(value/1000000).toFixed(1)}M`} // Format as Millions
                      width={50} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px'}} 
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 'dataMax']}
                      tickFormatter={value => value ? `R${Math.round(value)}` : ''}
                      width={60}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: COLOR_ELECTRIC_PURPLE, fontSize: '10px'}}
                      // label removed
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                          backgroundColor: getCssVar('--chart-tooltip-bg'), 
                          borderColor: getCssVar('--border-color'),
                          borderRadius: '0.375rem'
                      }}
                      itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
                      labelStyle={{ color: CHART_AXIS_COLOR }}
                      formatter={(value, name) => {
                        if (name === 'Avg Basket Value') return [formatCurrency(value), 'Avg Basket Value'];
                        if (name === 'Total Turnover') return [formatCurrency(value), 'Total Turnover'];
                        return [formatCurrency(value), name];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="total" name="Total Turnover">
                      {/* UPDATE: Map over dashboardRolling12MonthsData */}
                      {dashboardRolling12MonthsData.map((entry, idx) => (
                          <Cell
                              key={`cell-dash-rolling12-${entry.label}`}
                              fill={COLOR_COQUELICOT} 
                              radius={[4, 4, 0, 0]} 
                  />
              ))}
            </Bar>
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="avgBasketValueReported" 
              name="Avg Basket Value" 
              stroke={COLOR_WHITE} 
              strokeWidth={4}
              dot={false}
              activeDot={false}
            />
            <Legend />
          </ComposedChart>
        ) : (
          <div style={{ color: CHART_AXIS_COLOR, textAlign: 'center', paddingTop: '5rem' }}>Loading chart data...</div>
        )}
      </ResponsiveContainer>
    </div>
    {/* Cost of Sales Chart (now LineChart) */}
    <div className="chart-container" style={{ flex: 1, minWidth: 320 }}>
      <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Cost of Sales & Purchases (Last 12 Months)</h3>
      <ResponsiveContainer width="100%" height={220}>
         {/* UPDATE: Use dashboardRolling12MonthsData for LineChart */}
        {Array.isArray(dashboardRolling12MonthsData) && dashboardRolling12MonthsData.length > 0 ? (
          <LineChart data={dashboardRolling12MonthsData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
            <XAxis 
              dataKey="label" 
              interval={0} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px', angle: -30, textAnchor: 'end'}} 
            />
            <YAxis 
              tickFormatter={value => `R${(value/1000000).toFixed(1)}M`} // Format as Millions
              width={50} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px'}} 
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ 
                  backgroundColor: getCssVar('--chart-tooltip-bg'), 
                  borderColor: getCssVar('--border-color'),
                  borderRadius: '0.375rem'
              }}
              itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
              labelStyle={{ color: CHART_AXIS_COLOR }}
              formatter={(value, name) => [formatCurrency(value), name === 'costOfSales' ? 'Cost of Sales' : 'Purchases']} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="costOfSales" 
              name="Cost of Sales" 
              stroke={COLOR_GOLD} 
              strokeWidth={3}
              dot={false}
              activeDot={false}
            />
            <Line 
              type="monotone" 
              dataKey="purchases" 
              name="Purchases" 
              stroke={COLOR_ELECTRIC_PURPLE} 
              strokeWidth={3}
              dot={false}
              activeDot={false}
            />
          </LineChart>
        ) : (
          <div style={{ color: CHART_AXIS_COLOR, textAlign: 'center', paddingTop: '5rem' }}>Loading chart data...</div>
        )}
      </ResponsiveContainer>
    </div>
  </div>
  {/* End 12-Month Rolling Window Bar Charts Row */}

  {/* --- Daily Turnover Bar Chart (Dashboard) --- */}
  <div className="chart-container" style={{ marginTop: '0.1rem', maxWidth: '100%' }}>
    <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Daily Turnover (Selected Month)</h3>
    <ResponsiveContainer width="100%" height={220}>
      {Array.isArray(monthlyData) && monthlyData.length > 0 ? (
        <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
          <XAxis 
            dataKey="day" 
            tickFormatter={d => d}
            interval={0}
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px'}} 
          />
          <YAxis 
            tickFormatter={value => `R${(value/1000)}k`} 
            width={50} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px'}} 
          />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            contentStyle={{ 
                backgroundColor: getCssVar('--chart-tooltip-bg'), 
                borderColor: getCssVar('--border-color'),
                borderRadius: '0.375rem'
            }}
            itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
            labelStyle={{ color: CHART_AXIS_COLOR }}
            formatter={(value, name) => name === 'avgBasketValueReported' ? [formatCurrency(value), 'Avg Basket Value'] : [formatCurrency(value), 'Turnover']}
            labelFormatter={(label) => `Day ${label}`}
          />
          <Bar dataKey="turnover">
            {monthlyData.map((entry, idx) => {
              const currentYear = selectedYear;
              const currentMonthIndex = month - 1;
              const barDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`;
              const selectedDateStr = `${selectedYear}-${String(month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`;
              const isSelected = barDateStr === selectedDateStr;
              return (
                <Cell
                    key={`cell-dash-daily-${entry.day}`}
                    fill={COLOR_GOLD}
                    style={{ cursor: 'pointer' }}
                    radius={[4, 4, 0, 0]} 
                />
              );
            })}
          </Bar>
          <Line 
            type="monotone" 
            dataKey="avgBasketValueReported" 
            name="Avg Basket Value" 
            stroke={COLOR_ELECTRIC_PURPLE} 
            strokeWidth={3}
            dot={false}
            activeDot={false}
          />
          <Legend />
        </BarChart>
      ) : (
        <div style={{ color: CHART_AXIS_COLOR, textAlign: 'center', paddingTop: '5rem' }}>Loading chart data...</div>
      )}
    </ResponsiveContainer>
  </div>

  {/* More dashboard content can go here */}

        </section>
      )}

      {/* --- View Specific Sections --- */}
      {view === 'daily' && (
        <section className="daily-section">
           <div className="daily-date-selector-container" style={{ marginBottom: 'var(--gap-cards)' }}>
              <div className="date-part-selector">
                  <label htmlFor="daily-year-select">Year:</label>
                  <select 
                    id="daily-year-select"
                    className="input" 
                    value={selectedDate.getUTCFullYear()}
                    onChange={e => handleYearChange(e.target.value)}
                  >
                    {[...Array(5)].map((_, i) => {
                      const yearOption = currentYear - i;
                      return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                    }).reverse()}
                  </select>
              </div>

              <div className="date-part-selector">
                 <label htmlFor="daily-month-select">Month:</label>
                 <select 
                   id="daily-month-select"
                   className="input" 
                   value={selectedDate.getUTCMonth()}
                   onChange={e => handleMonthChange(e.target.value)}
                 >
                   {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthName, index) => (
                     <option key={monthName} value={index}>{monthName}</option>
                   ))}
                 </select>
              </div>

              <div className="date-part-selector">
                  <label htmlFor="daily-day-select">Day:</label>
                  <select 
                    id="daily-day-select"
                    className="input" 
                    value={selectedDate.getUTCDate()}
                    onChange={e => handleDayChange(e.target.value)}
                  >
                    {[...Array(getDaysInMonth(selectedDate))].map((_, i) => {
                      const dayOption = i + 1;
                      return <option key={dayOption} value={dayOption}>{dayOption}</option>;
                    })}
                  </select>
              </div>
           </div>

          <div className="top-row-layout">
            <div className="kpi-grid-container">
                <div className="kpis-grid kpis-grid--daily">
                    <div className="kpi-column">
                      <div className="kpi-card">
                        <div className="kpi-label">Total Turnover</div>
                        <div className="kpi-value kpi-value--accent">{formatCurrency(todayKPIs.turnover)}</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-label">Transactions</div>
                        <div className="kpi-value">{todayKPIs.transactions?.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                      </div>
                    </div>

                    <div className="kpi-column">
                      <div className="kpi-card">
                        <div className="kpi-label">Gross Profit %</div>
                        <div className="kpi-value">{todayKPIs.gpPercent?.toFixed(1)}%</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-label">Gross Profit Value</div>
                        <div className="kpi-value">{formatCurrency(todayKPIs.gpValue)}</div>
                      </div>
                    </div>

                    <div className="kpi-column">
                      <div className="kpi-card">
                        <div className="kpi-label">Cost of Sales</div>
                        <div className="kpi-value">{formatCurrency(todayKPIs.costOfSales)}</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-label">Purchases</div>
                        <div className="kpi-value">{formatCurrency(todayKPIs.purchases)}</div>
                      </div>
                    </div>
                </div>
            </div>
            
            <div className="donut-chart-container">
                <div className="chart-container chart-container--donut">
                    <ResponsiveContainer width="100%" height={250}>
                         <PieChart> 
                            <Pie
                                data={dailyDonutData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50} 
                                outerRadius={90} 
                                fill="#8884d8" 
                                paddingAngle={5}
                                dataKey="value"
                                labelLine={false}
                                label={null}
                                cornerRadius={3}
                            >
                            {dailyDonutData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={DONUT_COLORS[index % DONUT_COLORS.length]} 
                                    stroke="none" 
                                />
                            ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                            <Legend 
                               layout="vertical" 
                               verticalAlign="middle" 
                               align="right"
                               wrapperStyle={{ fontSize: 'var(--text-sm)', paddingLeft: '10px'}} 
                               formatter={(value, entry) => { 
                                    const itemValue = entry.payload?.value; 
                                    if (itemValue == null) return value; 
                                    const percent = dailyDonutTotal > 0 ? ((itemValue / dailyDonutTotal) * 100).toFixed(0) : 0; 
                                    return `${value} (${percent}%)`; 
                               }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          <div className="chart-container" style={{marginTop: 'var(--gap-cards)'}}>
            <ResponsiveContainer width="100%" height={250}>
                {Array.isArray(monthlyData) && monthlyData.length > 0 && ( 
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                    <XAxis 
                      dataKey="day" 
                      tickFormatter={d => d}
                      interval={0}
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px'}} 
                    />
                    <YAxis 
                      tickFormatter={value => `R${(value/1000)}k`} 
                      width={50} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px'}} 
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                          backgroundColor: getCssVar('--chart-tooltip-bg'), 
                          borderColor: getCssVar('--border-color'),
                          borderRadius: '0.375rem'
                      }}
                      itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
                      labelStyle={{ color: CHART_AXIS_COLOR }}
                      formatter={(value, name) => name === 'avgBasketValueReported' ? [formatCurrency(value), 'Avg Basket Value'] : [formatCurrency(value), 'Turnover']}
                      labelFormatter={(label) => `Day ${label}`}
                    />
                    <Bar dataKey="turnover">
                      {monthlyData.map((entry, idx) => {
                        const currentYear = selectedYear;
                        const currentMonthIndex = month - 1;
                        const barDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`;
                        const selectedDateStr = `${selectedYear}-${String(month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`;
                        const isSelected = barDateStr === selectedDateStr;
                        return (
                          <Cell
                              key={`cell-dash-daily-${entry.day}`}
                              fill={COLOR_GOLD}
                              style={{ cursor: 'pointer' }}
                              radius={[4, 4, 0, 0]} 
                          />
                        );
                      })}
                    </Bar>
                    <Line 
                      type="monotone" 
                      dataKey="avgBasketValueReported" 
                      name="Avg Basket Value" 
                      stroke={COLOR_ELECTRIC_PURPLE} 
                      strokeWidth={3}
                      dot={false}
                      activeDot={false}
                    />
                    <Legend />
                  </BarChart>
                )}
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {view === 'monthly' && (
        <section className="monthly-section">
           <div className="month-selector-container" style={{ marginBottom: 'var(--gap-cards)' }}>
             <div className="year-selector">
                <label htmlFor="year-select">Year:</label>
                <select 
                  id="year-select"
                  className="input" 
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                >
                  {[...Array(5)].map((_, i) => {
                    const yearOption = currentYear - i;
                    return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                  }).reverse()}
                </select>
             </div>
             
             <div className="month-buttons">
               {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthName, index) => {
                 const monthNumber = index + 1;
                 const isSelectedMonth = month === monthNumber;
                 return (
                   <button 
                     key={monthName}
                     onClick={() => setMonth(monthNumber)}
                     className={`button button-month ${isSelectedMonth ? 'active' : ''}`}
                   >
                     {monthName}
                   </button>
                 );
               })}
             </div>
           </div>

          <div className="top-row-layout">
            <div className="kpi-grid-container">
                <div className="kpis-grid kpis-grid--daily">
                    <div className="kpi-column">
                      <div className="kpi-card">
                        <div className="kpi-label">Total Turnover (Month)</div>
                        <div className="kpi-value kpi-value--accent">{formatCurrency(monthlyAgg.turnover)}</div>
                      </div>
                       <div className="kpi-card">
                        <div className="kpi-label">Transactions (Month)</div>
                        <div className="kpi-value">{monthlyAgg.transactions?.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                      </div>
                    </div>
                    <div className="kpi-column">
                      <div className="kpi-card">
                        <div className="kpi-label">Gross Profit % (Month)</div>
                        <div className="kpi-value">{monthlyAgg.turnover ? ((monthlyAgg.turnover - monthlyAgg.costOfSales) / monthlyAgg.turnover * 100).toFixed(1) : 0}%</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-label">Gross Profit Value (Month)</div>
                        <div className="kpi-value">{formatCurrency(monthlyAgg.turnover - monthlyAgg.costOfSales)}</div>
                      </div>
                    </div>
                    <div className="kpi-column">
                       <div className="kpi-card">
                        <div className="kpi-label">Cost of Sales (Month)</div>
                        <div className="kpi-value">{formatCurrency(monthlyAgg.costOfSales)}</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-label">Purchases (Month)</div>
                        <div className="kpi-value">{formatCurrency(monthlyAgg.purchases)}</div>
                      </div>
                    </div>
                </div>
            </div>
            
            <div className="donut-chart-container">
                <div className="chart-container chart-container--donut">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart> 
                            <Pie
                                data={monthlyDonutData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50} 
                                outerRadius={90} 
                                fill="#8884d8" 
                                paddingAngle={5}
                                dataKey="value"
                                labelLine={false}
                                label={null} 
                                cornerRadius={3}
                            >
                            {monthlyDonutData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={DONUT_COLORS[index % DONUT_COLORS.length]} 
                                    stroke="none"
                                />
                            ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                            <Legend 
                               layout="vertical" 
                               verticalAlign="middle" 
                               align="right"
                               wrapperStyle={{ fontSize: 'var(--text-sm)', paddingLeft: '10px'}} 
                               formatter={(value, entry) => { 
                                    const itemValue = entry.payload?.value; 
                                    if (itemValue == null) return value; 
                                    const percent = monthlyDonutTotal > 0 ? ((itemValue / monthlyDonutTotal) * 100).toFixed(0) : 0;
                                    return `${value} (${percent}%)`; 
                               }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          <div className="charts-row" style={{marginTop: 'var(--gap-cards)'}}> 
            <div className="chart-container">
                <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Cumulative Turnover Comparison</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={processedMonthlyCumulativeComparison} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}> 
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                        <XAxis 
                            dataKey="day"
                            tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)'}} 
                            tickLine={false} 
                            axisLine={{ stroke: CHART_AXIS_COLOR}} 
                            interval="preserveStartEnd"
                        />
                        <YAxis 
                            tickFormatter={value => `R${(value/1000000).toFixed(1)}M`} // Format as Millions
                            width={60} 
                            tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)'}} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <Tooltip 
                            formatter={(value, name) => {
                                const formattedValue = formatCurrency(value);
                                if (name === 'Cumulative (Current)') return [formattedValue, 'Cumulative (Current)'];
                                if (name === 'Cumulative (Previous)') return [formattedValue, 'Cumulative (Previous)'];
                                return [formattedValue, name];
                            }}
                            labelFormatter={(label) => `Day ${label}`} 
                            contentStyle={{ 
                                backgroundColor: getCssVar('--chart-tooltip-bg'), 
                                borderColor: getCssVar('--border-color'),
                                borderRadius: '0.375rem'
                            }}
                            itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
                            labelStyle={{ color: CHART_AXIS_COLOR }}
                        />
                        <Legend 
                            wrapperStyle={{ fontSize: 'var(--text-sm)', paddingTop: '10px'}} 
                        />
                        <Line 
                            name="Cumulative (Current)"
                            type="monotone" 
                            dataKey="current_cumulative_turnover"
                            stroke={CHART_BAR_PRIMARY}
                            strokeWidth={3} // Match Inventory Value Over Time change line thickness
                            dot={false} 
                            activeDot={{ r: 6, strokeWidth: 0, fill: getCssVar('--accent-primary-hover') }}
                        />
                        <Line 
                            name="Cumulative (Previous)"
                            type="monotone" 
                            dataKey="previous_cumulative_turnover"
                            stroke="#f1f1f1" 
                            strokeWidth={3} // Match thickness
                            dot={false} 
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#bdbdbd' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="chart-container">
               <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Cost-of-Sales vs Purchases</h3>
               <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyCumulativeCosts} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={d => d.split('-')[2]} 
                            tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)'}} 
                            tickLine={false} 
                            axisLine={{ stroke: CHART_AXIS_COLOR}} 
                            interval={1}
                        />
                        <YAxis 
                            tickFormatter={formatCurrency} // Revert to full currency format
                            width={60} 
                            tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)'}} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <Tooltip 
                            formatter={(value, name) => [formatCurrency(value), name.replace('cumulative_', '').replace('_', ' ')]}
                            labelFormatter={(label) => new Date(label + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric'})} 
                            contentStyle={{ 
                                backgroundColor: getCssVar('--chart-tooltip-bg'), 
                                borderColor: getCssVar('--border-color'),
                                borderRadius: '0.375rem'
                            }}
                            itemStyle={{ textTransform: 'capitalize' }}
                            labelStyle={{ color: CHART_AXIS_COLOR }} 
                        />
                        <Legend 
                            wrapperStyle={{ fontSize: 'var(--text-sm)', paddingTop: '10px'}} 
                            formatter={(value) => value.replace('cumulative_', '').replace('_', ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase())}
                        />
                        <Line 
                            name="Cost of Sales"
                            type="monotone" 
                            dataKey="cumulative_cost_of_sales" 
                            stroke={CHART_BAR_PRIMARY}
                            strokeWidth={3} // Match thickness
                            dot={false} 
                            activeDot={{ r: 6, strokeWidth: 0, fill: getCssVar('--accent-primary-hover') }}
                        />
                        <Line 
                            name="Purchases"
                            type="monotone" 
                            dataKey="cumulative_purchases" 
                            stroke="#f1f1f1"
                            strokeWidth={3} // Match thickness
                            dot={false} 
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#f1f1f1' }}
                        />
                    </LineChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-container" style={{marginTop: 'var(--gap-cards)'}}> 
            <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Daily Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
                {Array.isArray(monthlyData) && monthlyData.length > 0 && ( 
                  <ComposedChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                    <XAxis 
                      dataKey="day" 
                      tickFormatter={d => d} 
                      interval={0} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)'}} 
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left"
                      tickFormatter={value => `R${(value/1000)}k`} 
                      width={50} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)'}} 
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      tickFormatter={value => formatCurrency(value)} 
                      width={60} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: CHART_AXIS_COLOR, fontSize: '0.7rem' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                          backgroundColor: getCssVar('--chart-tooltip-bg'), 
                          borderColor: getCssVar('--border-color'),
                          borderRadius: '0.375rem'
                      }}
                      itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
                      labelStyle={{ color: CHART_AXIS_COLOR }}
                      formatter={(value, name) => {
                         if (name === 'Daily Turnover') return [formatCurrency(value), 'Daily Turnover'];
                         if (name === 'Avg Basket Value') return [formatCurrency(value), 'Avg Basket Value'];
                         return [formatCurrency(value), name]; 
                      }}
                      labelFormatter={(label) => `Day ${label}`} 
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar yAxisId="left" dataKey="turnover" name="Daily Turnover">
                      {monthlyData.map((entry, idx) => (
                          <Cell
                              key={`cell-monthly-daily-${entry.day}`}
                              fill={chartColors.secondary} 
                              radius={[4, 4, 0, 0]} 
                          />
                      ))}
                    </Bar>
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="avgBasketValueReported" 
                      name="Avg Basket Value"
                      stroke={chartColors.selected}
                      strokeWidth={3} // Match thickness
                      dot={{ r: 4, strokeWidth: 1, fill: chartColors.selected }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: chartColors.selected }}
                    />
                  </ComposedChart>
                )}
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {view === 'yearly' && (
        <section className="yearly-section">
           <div className="year-selector" style={{ marginBottom: 'var(--gap-cards)' }}>
              <label htmlFor="yearly-year-select">Year:</label>
              <select 
                id="yearly-year-select"
                className="input" 
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              >
                {[...Array(5)].map((_, i) => {
                  const yearOption = currentYear - i;
                  return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                }).reverse()}
              </select>
           </div>

           <div className="yearly-top-row-container">
             <div className="kpi-grid-container">
                 <div className="kpis-grid kpis-grid--yearly">
                     <div className="kpi-card">
                       <div className="kpi-label">Total Turnover ({selectedYear})</div>
                       <div className="kpi-value kpi-value--accent">{formatCurrency(yearlyAggregates.current_turnover)}</div>
                     </div>
                     <div className="kpi-card">
                       <div className="kpi-label">Gross Profit % ({selectedYear})</div>
                       <div className="kpi-value">
                         {yearlyAggregates.current_turnover > 0 ? 
                           (((yearlyAggregates.current_turnover - yearlyAggregates.current_cost_of_sales) / yearlyAggregates.current_turnover) * 100).toFixed(1)
                           : 0}%
                       </div>
                     </div>
                     <div className="kpi-card">
                       <div className="kpi-label">YoY Turnover Growth</div>
                       <div className="kpi-value" style={{
                         color: adjustedYearlyYoY === Infinity ? 'var(--status-success)'
                           : adjustedYearlyYoY > 0 ? 'var(--status-success)'
                           : adjustedYearlyYoY < 0 ? 'var(--status-error)'
                           : 'inherit'
                       }}>
                         {adjustedYearlyYoY === Infinity ? '∞%'
                           : adjustedYearlyYoY !== null ? `${adjustedYearlyYoY.toFixed(1)}%`
                           : 'N/A'}
                       </div>
                     </div>
                     <div className="kpi-card">
                       <div className="kpi-label">Cost of Sales ({selectedYear})</div>
                       <div className="kpi-value">{formatCurrency(yearlyAggregates.current_cost_of_sales)}</div>
                     </div>
                     <div className="kpi-card">
                       <div className="kpi-label">Purchases ({selectedYear})</div>
                       <div className="kpi-value">{formatCurrency(yearlyAggregates.current_purchases)}</div>
                     </div>
                     <div className="kpi-card">
                       <div className="kpi-label">Transactions ({selectedYear})</div>
                       <div className="kpi-value">{yearlyAggregates.current_transactions?.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                     </div>
                 </div>
             </div> 
             
             <div className="donut-chart-container">
                 <div className="chart-container chart-container--donut">
                     <ResponsiveContainer width="100%" height={250}>
                          <PieChart> 
                             <Pie
                                 data={yearlyDonutData} 
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={50} 
                                 outerRadius={90} 
                                 fill="#8884d8" 
                                 paddingAngle={5}
                                 dataKey="value"
                                 labelLine={false}
                                 label={null}
                                 cornerRadius={3} 
                             >
                             {yearlyDonutData.map((entry, index) => (
                                 <Cell 
                                     key={`yearly-donut-cell-${index}`} 
                                     fill={DONUT_COLORS[index % DONUT_COLORS.length]} 
                                     stroke="none" 
                                 />
                             ))}
                             </Pie>
                             <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                             <Legend 
                                layout="vertical" 
                                verticalAlign="middle" 
                                align="right"
                                wrapperStyle={{ fontSize: 'var(--text-sm)', paddingLeft: '10px'}} 
                                formatter={(value, entry) => { 
                                     const itemValue = entry.payload?.value; 
                                     if (itemValue == null) return value; 
                                     const percent = yearlyTotalTurnover > 0 ? ((itemValue / yearlyTotalTurnover) * 100).toFixed(0) : 0; 
                                     return `${value} (${percent}%)`; 
                                }}
                             />
                         </PieChart>
                     </ResponsiveContainer>
                 </div>
             </div> 
           </div>

{/* NEW: Monthly Totals Bar Chart (Moved Below KPIs) */} 
<div className="chart-container" style={{ marginTop: 'var(--gap-cards)', marginBottom: 'var(--gap-cards)' }}> 
             <h3 style={{marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Monthly Turnover ({selectedYear})</h3>
             <ResponsiveContainer width="100%" height={200}> 
                 {Array.isArray(calculatedMonthlyTotals) && calculatedMonthlyTotals.length > 0 && (
                   <BarChart data={calculatedMonthlyTotals} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                     <XAxis 
                       dataKey="month" 
                       tickFormatter={(monthNum) => new Date(0, monthNum - 1).toLocaleString('default', { month: 'short' })} 
                       interval={0} 
                       tickLine={false} 
                       axisLine={false} 
                       tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)'}} 
                     />
                     <YAxis 
                       tickFormatter={value => `R${(value/1000000).toFixed(1)}M`} // Set ticks to Millions format
                       width={50} 
                       tickLine={false} 
                       axisLine={false} 
                       tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)'}} 
                     />
                     <Tooltip
                       cursor={{ fill: 'transparent' }}
                       contentStyle={{ 
                           backgroundColor: getCssVar('--chart-tooltip-bg'), 
                           borderColor: getCssVar('--border-color'),
                           borderRadius: '0.375rem'
                       }}
                       itemStyle={{ color: getCssVar('--chart-tooltip-text') }}
                       labelStyle={{ color: CHART_AXIS_COLOR }}
                       formatter={(value) => [formatCurrency(value), 'Total Turnover']} // Set tooltip to full format
                       labelFormatter={(label) => new Date(0, label - 1).toLocaleString('default', { month: 'long' })} 
                     />
                     <Bar dataKey="total" name="Total Turnover">
                       {calculatedMonthlyTotals.map((entry, idx) => (
                           <Cell
                               key={`cell-monthly-total-${entry.month}`}
                               fill={'#7FFF00'} // Chartreuse
                               radius={[4, 4, 0, 0]} 
                           />
                       ))}
                     </Bar>
                   </BarChart>
                 )}
             </ResponsiveContainer>
           </div>

           <div className="yearly-grid-container">
              <div className="yearly-grid-header-row">
                <div className="yearly-grid-spacer-col"></div>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(monthName => (
                  <div key={monthName} className="yearly-grid-month-header">{monthName}</div>
                ))}
              </div>
              {[...Array(31)].map((_, dayIndex) => {
                const dayOfMonth = dayIndex + 1;
                return (
                  <div key={dayOfMonth} className="yearly-grid-row">
                    <div className="yearly-grid-day-label-col">{dayOfMonth}</div>
                    <div className="yearly-grid-spacer-col"></div>
                    
                    {[...Array(12)].map((_, monthIndex) => {
                      const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
                      const daysInMonth = getDaysInMonth(new Date(Date.UTC(selectedYear, monthIndex)));
                      const isValidDate = dayOfMonth <= daysInMonth;
                      
                      const turnover = isValidDate ? (yearlyData[dateStr] || 0) : null;
                      const hasData = isValidDate && turnover > 0;
                      
                      if (hasData) {
                        const colorZero = '#f1f1f1'; 
                        const colorMax = heatmapMaxColor;
                        const backgroundColor = interpolateColor(turnover, maxYearlyTurnover, colorZero, colorMax);
                        return (
                          <div 
                            key={`${monthIndex}-${dayOfMonth}`}
                            className={`yearly-grid-cell has-data`}
                            style={{ backgroundColor: backgroundColor }}
                            title={`${dateStr}: ${formatCurrency(turnover)}`} 
                          >
                            <span className="yearly-grid-cell-value">
                              {formatCurrencyShortK(turnover)}
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div 
                            key={`${monthIndex}-${dayOfMonth}-empty`}
                            className={`yearly-grid-cell empty ${!isValidDate ? 'invalid' : ''}`}
                          />
                        );
                      }
                    })}
                  </div>
                );
              })}
           </div>

           {/* Updated Monthly Totals Summary - uses calculatedMonthlyTotals */}
           {Array.isArray(calculatedMonthlyTotals) && calculatedMonthlyTotals.length > 0 && (
             <div className="yearly-summary-section" style={{ marginTop: '1rem' }}>
                <div className="yearly-summary-row">
                  <div className="yearly-summary-values-container" style={{ paddingLeft: '25px' }}> 
                    {calculatedMonthlyTotals.map(summary => (
                      <div key={`calc-total-${summary.month}`} className="yearly-summary-value">
                        {formatCurrency(summary.total)}
                      </div>
                    ))}
                  </div>
                </div> 
                <div className="yearly-summary-row">
                  <div className="yearly-summary-values-container" style={{ paddingLeft: '25px' }}> 
                    {calculatedMonthlyTotals.map(summary => {
                      let value = 'N/A';
                      let color = 'inherit';
                      
                      if (summary.yoyGrowth === Infinity) {
                         value = '∞%'; 
                         if (summary.total > 0) color = 'var(--status-success)'; // Growth from zero
                      } else if (summary.yoyGrowth === 0.0) {
                          value = '0.0%';
                          color = 'inherit'; // No change
                      } else if (summary.yoyGrowth !== null && isFinite(summary.yoyGrowth)) {
                         value = `${summary.yoyGrowth.toFixed(1)}%`;
                         color = summary.yoyGrowth > 0 ? 'var(--status-success)' : 'var(--status-error)';
                      }
                      // If summary.yoyGrowth is null, value remains 'N/A' and color 'inherit'
                      
                      return (
                        <div key={`calc-yoy-${summary.month}`} className="yearly-summary-value yoy-growth" style={{ color }}>
                          {value}
                        </div>
                      );
                    })}
                  </div>
                </div> 
             </div>
           )}

        </section>
      )}
      
      {/* NEW: Placeholder Stock View */}
      {view === 'stock' && (
        <section className="stock-section" style={{ padding: 'var(--padding-section-md) 0' }}>
          {/* Year/Month Selectors (Copied from Monthly) */}
          <div className="month-selector-container" style={{ marginBottom: 'var(--gap-cards)' }}>
             {/* Year Selection Dropdown */}
             <div className="year-selector">
                <label htmlFor="stock-year-select">Year:</label>
                <select 
                  id="stock-year-select"
                  className="input" 
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                >
                  {[...Array(5)].map((_, i) => {
                    const yearOption = currentYear - i;
                    return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                  }).reverse()}
                </select>
             </div>
             {/* Month Selection Buttons */}
             <div className="month-buttons">
               {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthName, index) => {
                 const monthNumber = index + 1;
                 const isSelectedMonth = month === monthNumber;
                 return (
                   <button 
                     key={monthName}
                     onClick={() => setMonth(monthNumber)}
                     className={`button button-month ${isSelectedMonth ? 'active' : ''}`}
                   >
                     {monthName}
                   </button>
                 );
               })}
             </div>
           </div>

          {/* --- 5 Real Stock KPI Cards at the Top --- */}
          <div className="kpi-grid-container" style={{ marginBottom: 'var(--gap-cards)' }}>
            <div className="kpis-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <div className="kpi-card">
                <div className="kpi-label">Opening Stock</div>
                <div className="kpi-value">{formatCurrency(stockKPIs.opening_stock)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Purchases</div>
                <div className="kpi-value">{formatCurrency(stockKPIs.purchases)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Adjustments</div>
                <div className="kpi-value">{formatCurrency(stockKPIs.adjustments)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Closing Stock</div>
                <div className="kpi-value">{formatCurrency(stockKPIs.closing_stock)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Cost of Sales</div>
                <div className="kpi-value kpi-value--accent">{formatCurrency(stockKPIs.cost_of_sales)}</div>
              </div>
            </div>
          </div>

          {/* --- Three Gauge KPI Cards BELOW the 5 real KPIs --- */}
          <div className="kpi-grid-container" style={{ marginBottom: 'var(--gap-cards)' }}>
            <div className="kpis-grid kpis-grid--stock-placeholder">
              <InfoTooltip content="Stock Turnover Ratio:\nHow many times inventory is sold and replaced in the month.\nHigher = More efficient sales, Lower = Slower sales or overstocking.">
                <div className="kpi-card" style={{ position: 'relative' }}>
                  <InfoIcon />
                  <GaugeChart
                    value={stockKPIs.stock_turnover_ratio}
                    max={1.5}
                    color={GAUGE_COLORS_RECHARTS.turnover}
                    label="Turnover Ratio"
                  />
                </div>
              </InfoTooltip>
              <InfoTooltip content="Inventory to Sales Ratio:\nRand value of average inventory held per Rand of sales.\nLower = More efficient inventory management, Higher = Potential overstocking or slow sales.">
                <div className="kpi-card" style={{ position: 'relative' }}>
                  <InfoIcon />
                  <GaugeChart
                    value={inventoryToSalesRatio}
                    max={GAUGE_MAX_INV_SALES_RATIO}
                    color={GAUGE_COLORS_RECHARTS.invSales}
                    label="Inventory to Sales Ratio"
                  />
                </div>
              </InfoTooltip>
              <InfoTooltip content="Avg. Inventory Days of Supply (DSI):\nHow many days inventory would last based on the month's cost of sales rate.\nLower = Better cash flow, risk of stockouts. Higher = Slower turnover, tied-up capital.">
                <div className="kpi-card" style={{ position: 'relative' }}>
                  <InfoIcon />
                  <GaugeChart
                    value={stockKPIs.dsi}
                    max={GAUGE_MAX_DSI}
                    color={GAUGE_COLORS_RECHARTS.dsi}
                    label="Avg. Inventory Days of Supply"
                  />
                </div>
              </InfoTooltip>
            </div>
          </div>

          {/* --- Inventory Value Over Time Bar Chart --- */}
          <div className="charts-row" style={{ display: 'flex', gap: 'var(--gap-cards)', flexWrap: 'wrap', marginBottom: 'var(--gap-cards)' }}>
            <div className="chart-container" style={{ flex: 1, minWidth: 340, maxWidth: '100%' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Inventory Value Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                {/* Use ComposedChart to combine Bar and Line */}
                <ComposedChart data={inventoryHistoryData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                  <XAxis 
                    dataKey="label"
                    tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px', textAnchor: 'middle' }}
                    tickLine={false}
                    axisLine={false}
                    interval={0} // Show all labels
                    angle={0}
                    dy={10}
                    height={25}
                    tickFormatter={everyThirdMonthTick}
                  />
                  {/* Left Y-Axis for Inventory Value */}
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={value => `R${(value / 1000000).toFixed(1)}M`} // Use toFixed(1)
                    width={65} // Slightly wider for R
                    tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  {/* Right Y-Axis for Change */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={value => `${value >= 0 ? '+' : '-'}R${Math.abs(value / 1000).toFixed(0)}k`} // Add R and sign
                    domain={[-800000, 800000]} // Example domain centered at 0
                    ticks={[-800000, -600000, -400000, -200000, 0, 200000, 400000, 600000, 800000]} // Ticks every 200k
                    width={70} // Slightly wider for +/- R
                    tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'Inventory Value') {
                        return [value?.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }), 'Inventory Value'];
                      } else if (name === 'Change') {
                        return [value?.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }), 'Monthly Change'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={label => label}
                    contentStyle={{ backgroundColor: '#2d3748', borderColor: '#374151', borderRadius: '0.375rem', color: '#e2e8f0' }}
                    // itemStyle adjusted via formatter
                    labelStyle={{ color: CHART_AXIS_COLOR }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 'var(--text-sm)'}} />
                  <Bar yAxisId="left" dataKey="value" name="Inventory Value" fill="#FF4509" radius={[4, 4, 0, 0]} />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="change" 
                    name="Change" 
                    stroke="#ffffff" // White line for change
                    strokeWidth={3} // Make line thicker
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-container" style={{ flex: 1, minWidth: 340, maxWidth: '100%' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Inventory Vs Sales</h3>
              {inventoryTurnoverLoading ? (
                <div style={{ color: '#bdbdbd', textAlign: 'center', padding: '2rem' }}>Loading turnover data...</div>
              ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={inventoryAndTurnoverHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                  <XAxis 
                    dataKey="label"
                    tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px', textAnchor: 'middle' }}
                    tickLine={false}
                    axisLine={false}
                    interval={0} // Show all labels
                    angle={0}
                    dy={10}
                    height={25}
                    tickFormatter={everyThirdMonthTick}
                  />
                  <YAxis 
                    tickFormatter={value => `R${(value / 1000000).toFixed(1)}M`} // Use toFixed(1)
                    width={65} 
                    tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value?.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }), name]}
                    labelFormatter={label => label}
                    contentStyle={{ backgroundColor: '#2d3748', borderColor: '#374151', borderRadius: '0.375rem', color: '#e2e8f0' }}
                    labelStyle={{ color: CHART_AXIS_COLOR }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 'var(--text-sm)'}} />
                  <Line 
                    type="monotone"
                    dataKey="value"
                    name="Inventory Value"
                    stroke={typeof COLOR_GOLD !== 'undefined' ? COLOR_GOLD : '#FFD600'}
                    strokeWidth={4}
                    dot={false}
                    activeDot={{ r: 6, fill: typeof COLOR_GOLD !== 'undefined' ? COLOR_GOLD : '#FFD600' }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="turnover"
                    name="Turnover"
                    stroke={typeof COLOR_ELECTRIC_PURPLE !== 'undefined' ? COLOR_ELECTRIC_PURPLE : '#B200FF'}
                    strokeWidth={4}
                    dot={false}
                    activeDot={{ r: 6, fill: typeof COLOR_ELECTRIC_PURPLE !== 'undefined' ? COLOR_ELECTRIC_PURPLE : '#B200FF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Stock Bubble/Bar Grid */}
          <h3 style={{marginTop: 'var(--gap-cards)', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Daily Stock Movements (Selected Month)</h3>
          <div className="stock-bubble-grid-container">
             {/* Header Row for Days */}
             <div className="stock-bubble-grid-header-row">
                {[...Array(31)].map((_, index) => (
                  <div key={`day-header-${index + 1}`} className="stock-bubble-grid-day-header">{index + 1}</div>
                ))}
             </div>
             {/* Grid Body (Single Row) */}
             <div className="stock-bubble-grid">
                {(() => {
                  // Find max values across the whole year for BUBBLE scaling
                  const allYearlyValues = Object.values(yearlyDailyStockMovements);
                  const maxPurchaseYear = Math.max(0, 1, ...allYearlyValues.map(d => d.purchases || 0)); // Ensure max is at least 1 to avoid division by zero
                  const maxCostOfSalesYear = Math.max(0, 1, ...allYearlyValues.map(d => d.costOfSales || 0)); // Ensure max is at least 1
                  const maxBubbleRadius = 20; // Decreased Max radius again

                  // Find max values for the CURRENT MONTH for BAR scaling
                  const currentMonthStr = `${selectedYear}-${String(month).padStart(2, '0')}`;
                  const currentMonthValues = Object.entries(yearlyDailyStockMovements)
                    .filter(([dateStr]) => dateStr.startsWith(currentMonthStr))
                    .map(([, values]) => values);
                  const maxPurchaseMonth = Math.max(0, 1, ...currentMonthValues.map(d => d.purchases || 0));
                  const maxCostOfSalesMonth = Math.max(0, 1, ...currentMonthValues.map(d => d.costOfSales || 0));
                  
                  // --- Layout Constants ---
                  const svgWidth = 40;
                  const svgHeight = 145; // Increased height significantly for longer bars
                  const bubbleCenterY = 30; // Keep bubble position
                  const barBaselineY = 55; // Adjusted baseline slightly
                  const maxBarHeight = 77;  // Target ~70% increase from previous max (45 * 1.7)
                  // --- End Layout Constants ---

                  const calculateBubbleRadius = (value, maxValue) => {
                    if (maxValue <= 0 || value <= 0) return 0;
                    return Math.max(1, (value / maxValue) * maxBubbleRadius); 
                  };
                  
                  const calculateBarHeight = (value, maxValue) => {
                    if (maxValue <= 0 || value <= 0) return 0;
                    return Math.max(1, (value / maxValue) * maxBarHeight); // Ensure min height of 1 if value > 0
                  };

                  // Loop through Days (Columns)
                  return [...Array(31)].map((_, dayIndex) => {
                      const day = dayIndex + 1;
                      const monthStrPadded = String(month).padStart(2, '0'); // Use state 'month'
                      const dateStr = `${selectedYear}-${monthStrPadded}-${String(day).padStart(2, '0')}`;
                      const daysInSelectedMonth = getDaysInMonth(new Date(Date.UTC(selectedYear, month - 1)));
                      const isValidDate = day <= daysInSelectedMonth;

                      const data = yearlyDailyStockMovements[dateStr] || { purchases: 0, costOfSales: 0 };
                      const purchaseValue = isValidDate ? (data.purchases || 0) : 0;
                      const cosValue = isValidDate ? (data.costOfSales || 0) : 0;

                      const purchaseRadius = calculateBubbleRadius(purchaseValue, maxPurchaseYear);
                      const cosRadius = calculateBubbleRadius(cosValue, maxCostOfSalesYear);
                      
                      // Calculate bar heights based on MONTHLY max
                      const purchaseBarHeight = calculateBarHeight(purchaseValue, maxPurchaseMonth);
                      const cosBarHeight = calculateBarHeight(cosValue, maxCostOfSalesMonth);

                      const cellClass = isValidDate ? 'stock-bubble-grid-cell' : 'stock-bubble-grid-cell invalid';

                      return (
                        <div key={`${month}-${day}`} className={cellClass}>
                          {isValidDate && (purchaseRadius > 0 || cosRadius > 0 || purchaseBarHeight > 0 || cosBarHeight > 0) && ( 
                            <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} >
                              {/* Bubbles Group - Centered around bubbleCenterY */}
                              <g transform={`translate(0, ${bubbleCenterY - svgWidth/2})`}> {/* Adjust Y translation based on new center */} 
                                {/* Cost of Sales Circle (White) */}
                                {cosRadius > 0 && (
                                  <circle cx={svgWidth/2} cy={svgWidth/2} r={cosRadius} fill="rgba(255, 255, 255, 0.8)">
                                    <title>{`Day ${day}\nCost of Sales: ${formatCurrency(cosValue)}`}</title>
                                  </circle>
                                )}
                                {/* Purchase Circle (Orange) */}
                                {purchaseRadius > 0 && (
                                  <circle cx={svgWidth/2} cy={svgWidth/2} r={purchaseRadius} fill="rgba(255, 69, 0, 0.8)">
                                    <title>{`Day ${day}\nPurchases: ${formatCurrency(purchaseValue)}`}</title>
                                  </circle>
                                )}
                              </g>

                              {/* Bars Group - Starting at barBaselineY */}
                              {/* Cost of Sales Bar (White/Grey) */}
                              {cosBarHeight > 0 && (
                                <rect 
                                  x={(svgWidth/2) - 10} // Position left bar further left
                                  y={barBaselineY}
                                  width={9}           // Increased width
                                  height={cosBarHeight}
                                  fill="#CCCCCC" // Light grey for CoS bar
                                  rx="1" // Slightly rounded corners
                                >
                                 <title>{`Day ${day}\nCost of Sales: ${formatCurrency(cosValue)}`}</title> 
                                </rect>
                              )}
                              {/* Purchases Bar (Orange) */}
                              {purchaseBarHeight > 0 && (
                                <rect 
                                  x={(svgWidth/2) + 1} // Position right bar
                                  y={barBaselineY}
                                  width={9}           // Increased width
                                  height={purchaseBarHeight}
                                  fill="rgba(255, 69, 0, 0.9)" // Orange bar (slightly less transparent)
                                  rx="1" // Slightly rounded corners
                                >
                                 <title>{`Day ${day}\nPurchases: ${formatCurrency(purchaseValue)}`}</title> 
                                </rect>
                              )}
                            </svg>
                          )}
                        </div>
                      );
                  });
                })()} 
             </div>
          </div>
          {/* NEW: Legend for Stock Chart */}
          <div className="stock-legend" style={{ marginTop: '0.5rem' }}> {/* Add small top margin */} 
             <div className="stock-legend-item">
               <span className="stock-legend-color-swatch" style={{ backgroundColor: 'rgba(255, 69, 0, 0.8)' }}></span>
               Purchases
             </div>
             <div className="stock-legend-item">
               <span className="stock-legend-color-swatch" style={{ backgroundColor: '#CCCCCC' }}></span>
               Cost of Sales
             </div>
           </div>

        </section>
      )}
    </div>
  );
}

export default App;

