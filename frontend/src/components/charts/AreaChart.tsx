import { AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AreaChartProps { data: any[]; dataKey: string; xKey?: string; color?: string; title?: string; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value?.toLocaleString()}</p>)}
    </div>
  );
};

export default function AreaChart({ data, dataKey, xKey = 'month', color = '#3B82F6', title }: AreaChartProps) {
  return (
    <div className="glass-card p-5 h-64">
      {title && <h3 className="text-sm font-semibold text-muted-foreground mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <ReAreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} animationDuration={1000} />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
