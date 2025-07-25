import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceData {
  period: string;
  value: number;
}

interface SimpleLineChartProps {
  data: PriceData[];
  height?: number;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ 
  data, 
  height = 320 
}) => {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg"
        style={{ height: `${height}px` }}
      >
        <div className="text-gray-500 text-center">
          <div className="text-lg font-medium">No price data available</div>
          <div className="text-sm">Please check your data source</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="period" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={['dataMin - 0.1', 'dataMax + 0.1']}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-800">{label}</p>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Price:</span> ${data.value?.toFixed(3)}</p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#007bff"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimpleLineChart;