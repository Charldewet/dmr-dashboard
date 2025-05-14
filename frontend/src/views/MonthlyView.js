import React from 'react';
import DonutChart from '../components/DonutChart';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, CartesianGrid, XAxis, YAxis, BarChart, Bar, Line } from 'recharts';

function MonthlyView({
  monthlyAgg,
  monthlyDonutData,
  monthlyDonutTotal,
  processedMonthlyCumulativeComparison,
  monthlyCumulativeCosts,
  formatCurrency,
  selectedYear,
  month,
  setMonth,
  currentYear
}) {
  return (
    <section className="monthly-section">
      <div className="month-selector-container" style={{ marginBottom: 'var(--gap-cards)' }}>
        <div className="year-selector">
          <label htmlFor="year-select">Year:</label>
          <select
            id="year-select"
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
      <div className="top-row-layout">
        <div className="kpi-grid-container">
          <div className="kpis-grid kpis-grid--monthly">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#bdbdbd', fontSize: 'var(--text-sm)'}}
                tickLine={false}
                axisLine={{ stroke: '#bdbdbd'}}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={value => `R${(value/1000000).toFixed(1)}M`}
                width={60}
                tick={{ fill: '#bdbdbd', fontSize: 'var(--text-sm)'}}
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
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  borderColor: 'var(--border-color)',
                  borderRadius: '0.375rem'
                }}
                itemStyle={{ color: 'var(--chart-tooltip-text)' }}
                labelStyle={{ color: '#bdbdbd' }}
              />
              <Legend wrapperStyle={{ fontSize: 'var(--text-sm)', paddingTop: '10px'}} />
              <Line
                name="Cumulative (Current)"
                type="monotone"
                dataKey="current_cumulative_turnover"
                stroke="#7FFF00"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--accent-primary-hover)' }}
              />
              <Line
                name="Cumulative (Previous)"
                type="monotone"
                dataKey="previous_cumulative_turnover"
                stroke="#f1f1f1"
                strokeWidth={3}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={d => d.split('-')[2]}
                tick={{ fill: '#bdbdbd', fontSize: 'var(--text-sm)'}}
                tickLine={false}
                axisLine={{ stroke: '#bdbdbd'}}
                interval={1}
              />
              <YAxis
                tickFormatter={formatCurrency}
                width={60}
                tick={{ fill: '#bdbdbd', fontSize: 'var(--text-sm)'}}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value, name) => [formatCurrency(value), name]}
                labelFormatter={label => `Day ${label}`}
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  borderColor: 'var(--border-color)',
                  borderRadius: '0.375rem'
                }}
                itemStyle={{ color: 'var(--chart-tooltip-text)' }}
                labelStyle={{ color: '#bdbdbd' }}
              />
              <Legend wrapperStyle={{ fontSize: 'var(--text-sm)', paddingTop: '10px'}} />
              <Line
                name="Cost of Sales"
                type="monotone"
                dataKey="costOfSales"
                stroke="#FFD600"
                strokeWidth={3}
                dot={false}
                activeDot={false}
              />
              <Line
                name="Purchases"
                type="monotone"
                dataKey="purchases"
                stroke="#B200FF"
                strokeWidth={3}
                dot={false}
                activeDot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

export default MonthlyView; 