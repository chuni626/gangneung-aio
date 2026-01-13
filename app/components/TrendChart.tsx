'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function TrendChart({ data }: { data: any[] }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-80 flex flex-col">
      <h3 className="font-bold text-slate-700 mb-4">📈 주간 방문자 추이</h3>
      <div className="flex-1 w-full min-h-[200px]">
        {/* ResponsiveContainer에 minWidth/minHeight를 줘서 에러 방지 */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="name" 
              tick={{fontSize: 12, fill: '#94A3B8'}} 
              axisLine={false} 
              tickLine={false} 
              dy={10}
            />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line 
              type="monotone" 
              dataKey="visitor" 
              stroke="#4F46E5" 
              strokeWidth={3} 
              dot={{r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff'}} 
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}