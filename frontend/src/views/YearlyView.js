import React from 'react';
import DonutChart from '../components/DonutChart';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis, Line } from 'recharts';

function YearlyView({
  yearlyAggregates,
  adjustedYearlyYoY,
  formatCurrency,
  selectedYear,
  currentYear,
  yearlyDonutData,
  yearlyTotalTurnover,
  calculatedMonthlyTotals,
  yearlyData,
  maxYearlyTurnover,
  heatmapMaxColor,
  interpolateColor
}) {
  return (
    <section className="yearly-section">
      <div className="year-selector" style={{ marginBottom: 'var(--gap-cards)' }}>
        <label htmlFor="yearly-year-select">Year:</label>
        <select
          id="yearly-year-select"
          className="input"
          value={selectedYear}
          onChange={e => {/* handle year change in parent */}}
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
                      fill={['#FF4509', '#f1f1f1'][index % 2]}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: 'var(--text-sm)', paddingLeft: '10px' }}
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
      <div className="chart-container" style={{ marginTop: 'var(--gap-cards)', marginBottom: 'var(--gap-cards)' }}>
        <h3 style={{marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Monthly Turnover ({selectedYear})</h3>
        <ResponsiveContainer width="100%" height={200}>
          {Array.isArray(calculatedMonthlyTotals) && calculatedMonthlyTotals.length > 0 && (
            <BarChart data={calculatedMonthlyTotals} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis
                dataKey="month"
                tickFormatter={(monthNum) => new Date(0, monthNum - 1).toLocaleString('default', { month: 'short' })}
                interval={0}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#bdbdbd', fontSize: 'var(--text-sm)'}}
              />
              <YAxis
                tickFormatter={value => `R${(value/1000000).toFixed(1)}M`}
                width={50}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#bdbdbd', fontSize: 'var(--text-sm)'}}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  borderColor: 'var(--border-color)',
                  borderRadius: '0.375rem'
                }}
                itemStyle={{ color: 'var(--chart-tooltip-text)' }}
                labelStyle={{ color: '#bdbdbd' }}
                formatter={(value) => [formatCurrency(value), 'Total Turnover']}
                labelFormatter={(label) => new Date(0, label - 1).toLocaleString('default', { month: 'long' })}
              />
              <Bar dataKey="total" name="Total Turnover">
                {calculatedMonthlyTotals.map((entry, idx) => (
                  <Cell
                    key={`cell-monthly-total-${entry.month}`}
                    fill={'#7FFF00'}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {/* Heatmap and other yearly view content can be added here as needed */}
    </section>
  );
}

export default YearlyView; 