import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, Line, Legend, PieChart, Pie } from 'recharts';

export default function YearlyView(props) {
  const {
    currentYear,
    selectedYear,
    setSelectedYear,
    yearlyAggregates,
    yearlyDonutData,
    yearlyTotalTurnover,
    calculatedMonthlyTotals,
    adjustedYearlyYoY,
    yearlyData,
    maxYearlyTurnover,
    formatCurrency,
    formatCurrencyShortK,
    getCssVar,
    COLOR_COQUELICOT,
    COLOR_WHITE,
    COLOR_ELECTRIC_PURPLE,
    CHART_GRID_COLOR,
    CHART_AXIS_COLOR,
    DONUT_COLORS,
    ...rest
  } = props;

  return (
    <section className="yearly-section">
      {/* Year selector and KPI grid */}
      <div className="year-selector-container" style={{ marginBottom: 'var(--gap-cards)' }}>
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
      </div>
      <div className="kpi-grid-container">
        <div className="kpis-grid kpis-grid--yearly">
          {/* Render 6 KPI cards directly as children */}
          {/* Example: */}
          {/* <div className="kpi-card">...</div> */}
          {/* ...repeat for all 6 KPIs... */}
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
      <div className="chart-container" style={{ marginTop: 'var(--gap-cards)' }}>
        <ResponsiveContainer width="100%" height={250}>
          {Array.isArray(yearlyData) && yearlyData.length > 0 && (
            <BarChart data={yearlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
              <XAxis
                dataKey="month"
                tickFormatter={d => d}
                interval={0}
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px' }}
              />
              <YAxis
                tickFormatter={value => `R${(value / 1000)}k`}
                width={50}
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART_AXIS_COLOR, fontSize: '10px' }}
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
                labelFormatter={label => `Month ${label}`}
              />
              <Bar dataKey="turnover">
                {yearlyData.map((entry, idx) => {
                  return (
                    <Cell
                      key={`cell-yearly-${entry.month}`}
                      fill={COLOR_COQUELICOT}
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
  );
} 