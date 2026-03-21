import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#14B8A6'];

interface DonutChartProps { data: { name: string; value: number }[]; title?: string; }

export default function DonutChart({ data, title }: DonutChartProps) {
  return (
    <div className="glass-card p-5 h-72">
      {title && <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="45%" innerRadius="50%" outerRadius="70%" paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={800}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
