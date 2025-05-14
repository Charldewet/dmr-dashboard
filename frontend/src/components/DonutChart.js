import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function DonutChart({ data, total, colors, formatCurrency, legendFormatter }) {
  return (
    <div className="chart-container chart-container--donut">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
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
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
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
            formatter={legendFormatter ? legendFormatter : (value, entry) => {
              const itemValue = entry.payload?.value;
              if (itemValue == null) return value;
              const percent = total > 0 ? ((itemValue / total) * 100).toFixed(0) : 0;
              return `${value} (${percent}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
} 