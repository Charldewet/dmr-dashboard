import React from 'react';
import GaugeChart from '../components/GaugeChart';
import InfoTooltip from '../components/InfoTooltip';
import InfoIcon from '../components/InfoIcon';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, Line, Legend, LineChart } from 'recharts';

function StockView({
  stockKPIs,
  formatCurrency,
  selectedYear,
  month,
  setMonth,
  currentYear,
  inventoryToSalesRatio,
  GAUGE_COLORS_RECHARTS,
  GAUGE_MAX_INV_SALES_RATIO,
  GAUGE_MAX_DSI,
  inventoryHistoryData,
  inventoryTurnoverLoading,
  inventoryAndTurnoverHistory,
  yearlyDailyStockMovements,
  getDaysInMonth,
  COLOR_ELECTRIC_PURPLE,
  CHART_GRID_COLOR,
  CHART_AXIS_COLOR,
  everyThirdMonthTick
}) {
  return (
    <section className="stock-section" style={{ padding: 'var(--padding-section-md) 0' }}>
      <div className="month-selector-container" style={{ marginBottom: 'var(--gap-cards)' }}>
        <div className="year-selector">
          <label htmlFor="stock-year-select">Year:</label>
          <select
            id="stock-year-select"
            className="input"
            value={selectedYear}
            onChange={e => setMonth(parseInt(e.target.value, 10))}
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
      <div className="kpi-grid-container" style={{ marginBottom: 'var(--gap-cards)' }}>
        <div className="kpis-grid kpis-grid--stock">
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
      {/* Inventory Value Over Time Bar Chart */}
      <div className="charts-row" style={{ display: 'flex', gap: 'var(--gap-cards)', flexWrap: 'wrap', marginBottom: 'var(--gap-cards)' }}>
        <div className="chart-container" style={{ flex: 1, minWidth: 340, maxWidth: '100%' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Inventory Value Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={inventoryHistoryData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px', textAnchor: 'middle' }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={0}
                dy={10}
                height={25}
                tickFormatter={everyThirdMonthTick}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={value => `R${(value / 1000000).toFixed(1)}M`}
                width={65}
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={value => `${value >= 0 ? '+' : '-'}R${Math.abs(value / 1000).toFixed(0)}k`}
                domain={[-800000, 800000]}
                ticks={[-800000, -600000, -400000, -200000, 0, 200000, 400000, 600000, 800000]}
                width={70}
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
                labelStyle={{ color: CHART_GRID_COLOR }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 'var(--text-sm)'}} />
              <Bar yAxisId="left" dataKey="value" name="Inventory Value" fill="#FF4509" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="change"
                name="Change"
                stroke="#ffffff"
                strokeWidth={3}
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
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={value => `R${(value / 1000000).toFixed(1)}M`}
                  width={65}
                  tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={value => `R${(value / 1000000).toFixed(1)}M`}
                  width={65}
                  tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-sm)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'Inventory Value') {
                      return [value?.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }), 'Inventory Value'];
                    } else if (name === 'Turnover') {
                      return [value?.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }), 'Turnover'];
                    }
                    return [value, name];
                  }}
                  labelFormatter={label => label}
                  contentStyle={{ backgroundColor: '#2d3748', borderColor: '#374151', borderRadius: '0.375rem', color: '#e2e8f0' }}
                  labelStyle={{ color: CHART_GRID_COLOR }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 'var(--text-sm)'}} />
                <Bar yAxisId="left" dataKey="value" name="Inventory Value" fill="#FF4509" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="turnover"
                  name="Turnover"
                  stroke={COLOR_ELECTRIC_PURPLE}
                  strokeWidth={4}
                  dot={false}
                  activeDot={{ r: 6, fill: COLOR_ELECTRIC_PURPLE }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {/* Additional stock view content (e.g., bubble/bar grid) can be added here as needed */}
    </section>
  );
}

export default StockView; 