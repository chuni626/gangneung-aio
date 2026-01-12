'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function TrendChart({ data }: { data: any[] }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-64">
      <h3 className="font-bold text-slate-700 mb-4">📈 주간 방문자 추이</h3>
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip />
            <Line type="monotone" dataKey="visitor" stroke="#4F46E5" strokeWidth={3} dot={{r: 4}} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}