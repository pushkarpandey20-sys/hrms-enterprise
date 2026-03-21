import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BarChartComponentProps { data: any[]; dataKeys: { key: string; color: string }[]; xKey?: string; title?: string; formatter?: (v: number) => string; }

export default function BarChartComponent({ data, dataKeys, xKey = 'month', title, formatter }: BarChartComponentProps) {
  return (
    <div className="glass-card p-5 h-72">
      {title && <h3 className="text-sm font-semibold text-muted-foreground mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={formatter} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} formatter={formatter ? (v: number) => [formatter(v)] : undefined} />
          {dataKeys.map(({ key, color }) => (
            <Bar key={key} dataKey={key} fill={color} radius={[4, 4, 0, 0]} animationDuration={800} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
