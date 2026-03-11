import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';

interface ChartProps {
  data: any[];
  symbol: string;
}

export const Chart: React.FC<ChartProps> = ({ data, symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e11' },
        textColor: '#848e9c',
      },
      grid: {
        vertLines: { color: '#161a1e' },
        horzLines: { color: '#161a1e' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        borderColor: '#2b3139',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#02c076',
      downColor: '#f84960',
      borderVisible: false,
      wickUpColor: '#02c076',
      wickDownColor: '#f84960',
    });

    candlestickSeries.setData(data);
    
    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData(data);
    }
  }, [data]);

  return (
    <div className="relative w-full">
      <div className="absolute top-2 left-4 z-10 flex items-center gap-2">
        <span className="text-lg font-bold text-hl-text">{symbol}</span>
        <span className="text-xs text-hl-text-muted">Perpetual</span>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
};
