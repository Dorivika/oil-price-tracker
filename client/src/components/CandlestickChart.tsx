import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

interface CandlestickData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  height?: number;
  title?: string;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  data, 
  height = 400, 
  title = "Fuel Price Candlestick Chart" 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: '#333',
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: {
          color: 'rgba(197, 203, 206, 0.5)',
        },
        horzLines: {
          color: 'rgba(197, 203, 206, 0.5)',
        },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        scaleMargins: {
          top: 0.05,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [height]);

  useEffect(() => {
    if (seriesRef.current && data && data.length > 0) {
      setIsLoading(true);
      
      try {
        // Convert data to lightweight-charts format with proper time conversion
        const formattedData = data.map((item, index) => {
          // Convert date string to timestamp if needed
          let timeValue: number;
          
          if (typeof item.time === 'string') {
            // Try to parse the date string
            const date = new Date(item.time);
            if (isNaN(date.getTime())) {
              // If date parsing fails, use index as time
              timeValue = Math.floor(Date.now() / 1000) - (data.length - index) * 86400; // 1 day intervals
            } else {
              timeValue = Math.floor(date.getTime() / 1000);
            }
          } else {
            timeValue = item.time;
          }

          return {
            time: timeValue,
            open: Number(item.open) || 0,
            high: Number(item.high) || 0,
            low: Number(item.low) || 0,
            close: Number(item.close) || 0,
          };
        }).filter(item => 
          item.open > 0 && item.high > 0 && item.low > 0 && item.close > 0
        );

        if (formattedData.length > 0) {
          seriesRef.current.setData(formattedData);
          
          // Fit content to the chart
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error formatting candlestick data:', error);
        setIsLoading(false);
      }
    }
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div 
        ref={chartContainerRef}
        className="flex items-center justify-center bg-gray-50 rounded-lg"
        style={{ height: `${height}px` }}
      >
        <div className="text-gray-500 text-center">
          <div className="text-lg font-medium">No candlestick data available</div>
          <div className="text-sm">Insufficient price data for OHLC analysis</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-lg">
          <div className="text-gray-600">Loading chart...</div>
        </div>
      )}
      
      <div 
        ref={chartContainerRef}
        className="border border-gray-200 rounded-lg bg-white"
        style={{ height: `${height}px` }}
      />
      
      <div className="mt-2 text-xs text-gray-500 flex justify-between">
        <span>🟢 Green: Price Up | 🔴 Red: Price Down</span>
        <span>{data.length} data points</span>
      </div>
    </div>
  );
};

export default CandlestickChart;