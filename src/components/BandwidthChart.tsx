import { useState, useMemo } from 'react';
import { BarChart3, LineChart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BandwidthChartProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  ratePerGB?: number; // USD per GB, e.g. 0.30
}

export function BandwidthChart({
  data,
  title,
  subtitle,
  ratePerGB = 0.30,
}: BandwidthChartProps) {
  const { language } = useLanguage();
  const defaultTitle = language === 'vi' ? 'Lưu lượng băng thông chia sẻ' : 'Bandwidth Sharing Traffic';
  const displayTitle = title || defaultTitle;
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const dates = Object.keys(data).sort();
    return dates.map((date) => ({
      date,
      displayDate: date.slice(5).replace('-', '/'), // MM/DD
      bandwidthGB: data[date] || 0,
      bandwidthMB: Math.round((data[date] || 0) * 1024),
      estimatedUsd: (data[date] || 0) * ratePerGB,
    }));
  }, [data, ratePerGB]);

  const maxVal = useMemo(() => {
    const vals = chartData.map((d) => d.bandwidthGB);
    const m = Math.max(...vals, 0.1);
    // Round up nicely
    return Math.ceil(m * 10) / 10;
  }, [chartData]);

  const totalGB = useMemo(() => {
    return chartData.reduce((acc, cur) => acc + cur.bandwidthGB, 0);
  }, [chartData]);

  const totalEstUsd = totalGB * ratePerGB;

  // Chart Dimensions
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const width = 640; // scalable viewbox

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    const step = chartData.length > 1 ? plotWidth / (chartData.length - 1) : plotWidth;
    return chartData.map((item, idx) => {
      const x = paddingLeft + (chartData.length === 1 ? plotWidth / 2 : idx * step);
      const ratio = maxVal > 0 ? item.bandwidthGB / maxVal : 0;
      const y = paddingTop + plotHeight - ratio * plotHeight;
      return { x, y, item, idx };
    });
  }, [chartData, maxVal, plotWidth, plotHeight, paddingLeft, paddingTop]);

  // Generate SVG path for line
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    // Catmull-Rom or cubic spline
    return points.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
    }, '');
  }, [points]);

  // Area path for gradient fill
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = paddingTop + plotHeight;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    return `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [linePath, points, paddingTop, plotHeight]);

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{displayTitle}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {subtitle || (language === 'vi' 
              ? `Tổng cộng: ${totalGB.toFixed(3)} GB · Ước tính: ~$${totalEstUsd.toFixed(2)} USD`
              : `Total: ${totalGB.toFixed(3)} GB · Estimated: ~$${totalEstUsd.toFixed(2)} USD`)}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg self-start sm:self-auto border border-slate-700/50">
          <button
            type="button"
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              chartType === 'line'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Đường' : 'Line'}</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              chartType === 'bar'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Cột' : 'Bar'}</span>
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative w-full">
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-500">
            {language === 'vi' 
              ? 'Chưa có dữ liệu lưu lượng băng thông trong khoảng thời gian này'
              : 'No bandwidth sharing data available for this timeframe'}
          </div>
        ) : (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto overflow-visible select-none"
              style={{ minHeight: '200px' }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = paddingTop + plotHeight - pct * plotHeight;
                const labelVal = (pct * maxVal).toFixed(2);
                return (
                  <g key={pct}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={width - paddingRight}
                      y2={y}
                      stroke="#334155"
                      strokeDasharray="3 3"
                      strokeOpacity="0.5"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Render Bar Chart */}
              {chartType === 'bar' && (
                <g>
                  {chartData.map((item, idx) => {
                    const step = plotWidth / chartData.length;
                    const barWidth = Math.max(step * 0.65, 8);
                    const x = paddingLeft + idx * step + (step - barWidth) / 2;
                    const ratio = maxVal > 0 ? item.bandwidthGB / maxVal : 0;
                    const barHeight = Math.max(ratio * plotHeight, 2);
                    const y = paddingTop + plotHeight - barHeight;
                    const isHovered = hoveredIndex === idx;

                    return (
                      <g key={item.date}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={3}
                          fill={isHovered ? '#34d399' : 'url(#barGradient)'}
                          className="transition-colors cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Render Line Chart */}
              {chartType === 'line' && (
                <g>
                  {/* Translucent Area Fill */}
                  <path d={areaPath} fill="url(#areaGradient)" />

                  {/* Main Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points */}
                  {points.map((pt) => {
                    const isHovered = hoveredIndex === pt.idx;
                    return (
                      <g key={pt.item.date}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 5.5 : 3.5}
                          fill={isHovered ? '#34d399' : '#10b981'}
                          stroke="#0f172a"
                          strokeWidth="2"
                          className="transition-all cursor-pointer"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Invisible full-height hover targets */}
              {points.map((pt) => {
                const step = plotWidth / (points.length || 1);
                const hoverLeft = pt.x - step / 2;
                return (
                  <rect
                    key={`hover-${pt.item.date}`}
                    x={hoverLeft}
                    y={paddingTop}
                    width={step}
                    height={plotHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(pt.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}

              {/* Active Crosshair indicator */}
              {activePoint && (
                <g pointerEvents="none">
                  <line
                    x1={activePoint.x}
                    y1={paddingTop}
                    x2={activePoint.x}
                    y2={paddingTop + plotHeight}
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={6}
                    fill="#34d399"
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* X Axis Labels */}
              {points.map((pt, i) => {
                // Show labels reasonably spaced
                const showLabel =
                  points.length <= 10 ||
                  i === 0 ||
                  i === points.length - 1 ||
                  i % Math.ceil(points.length / 7) === 0;

                if (!showLabel) return null;

                return (
                  <text
                    key={`label-${pt.item.date}`}
                    x={pt.x}
                    y={height - 10}
                    textAnchor="middle"
                    fill={hoveredIndex === i ? '#34d399' : '#64748b'}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {pt.item.displayDate}
                  </text>
                );
              })}
            </svg>

            {/* Floating Tooltip with boundary awareness to prevent edge clipping */}
            {activePoint && (() => {
              const pct = (activePoint.x / width) * 100;
              const isNearLeft = pct < 22 || activePoint.idx === 0;
              const isNearRight = pct > 78 || activePoint.idx === points.length - 1;

              let transform = 'translateX(-50%)';
              let leftStyle = `${pct}%`;

              if (isNearLeft) {
                // Align to right of cursor on first day or near-left points
                transform = 'translateX(0%)';
                leftStyle = `max(8px, ${pct - 1}%)`;
              } else if (isNearRight) {
                // Align to left of cursor on last day or near-right points
                transform = 'translateX(-100%)';
                leftStyle = `min(calc(100% - 8px), ${pct + 1}%)`;
              }

              return (
                <div
                  className="absolute z-30 pointer-events-none bg-slate-950/95 border border-slate-700/90 p-2.5 rounded-xl shadow-2xl text-xs backdrop-blur-md transition-all duration-75"
                  style={{
                    left: leftStyle,
                    top: '12px',
                    transform,
                    minWidth: '160px',
                    maxWidth: 'calc(100% - 16px)',
                  }}
                >
                  <div className="text-slate-400 font-mono text-[11px] border-b border-slate-800 pb-1.5 mb-1.5 flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-200">{activePoint.item.date}</span>
                    <span className="text-emerald-400 font-semibold px-1 py-0.2 bg-emerald-950/80 rounded border border-emerald-800/60 text-[10px]">
                      Proxyrack
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">{language === 'vi' ? 'Băng thông:' : 'Bandwidth:'}</span>
                      <span className="font-mono font-bold text-slate-100">
                        {activePoint.item.bandwidthGB >= 1
                          ? `${activePoint.item.bandwidthGB.toFixed(3)} GB`
                          : `${activePoint.item.bandwidthMB} MB`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">{language === 'vi' ? 'Ước tính thu:' : 'Est. earnings:'}</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +${activePoint.item.estimatedUsd.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Axis unit notes */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
        <span>{language === 'vi' ? 'Đơn vị: Gigabytes (GB) / ngày' : 'Unit: Gigabytes (GB) / day'}</span>
        <span>{language === 'vi' ? `Tỷ giá ước tính: $${ratePerGB.toFixed(2)} / GB` : `Est. rate: $${ratePerGB.toFixed(2)} / GB`}</span>
      </div>
    </div>
  );
}
