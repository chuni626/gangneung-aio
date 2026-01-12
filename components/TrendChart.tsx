'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';

interface ChartData {
  name: string;
  score: number;
  visitor: number;
}

interface Props {
  data: ChartData[];
}

// 마우스 올렸을 때 뜨는 예쁜 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-xl backdrop-blur-sm bg-white/90">
        <p className="text-slate-500 text-sm font-bold mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-blue-600 font-bold flex items-center">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
            🤖 AI 데이터 수집: {payload[0].value}건
          </p>
          <p className="text-green-500 font-bold flex items-center">
             <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            👨‍💻 실제 방문 확인: {payload[1].value}회
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
          데이터 기반 분석 중입니다.
        </p>
      </div>
    );
  }
  return null;
};

export default function TrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-slate-400">
        <div className="text-5xl mb-4">📉</div>
        <p className="font-bold">아직 데이터가 충분하지 않습니다.</p>
        <p className="text-sm mt-2">AI가 열심히 데이터를 모으는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            📈 AI vs 인간 활동 트렌드
          </h2>
          <p className="text-sm text-slate-500 mt-1">AI의 학습량과 실제 방문자의 관심도 변화 추이</p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-lg text-xs font-bold text-slate-500">
          최근 30일 기준
        </div>
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
        >
          {/* 그라데이션 색상 정의 */}
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorVisitor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#64748B', fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            tick={{ fill: '#64748B', fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-slate-600 font-bold text-sm">{value}</span>}
          />
          
          {/* 1. AI 데이터 (영역 차트 + 선) */}
          <Area type="monotone" dataKey="score" fill="url(#colorScore)" stroke="none" />
          <Line
            type="monotone"
            dataKey="score"
            name="🤖 AI 학습 데이터"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />

          {/* 2. 방문자 데이터 (영역 차트 + 선) */}
          <Area type="monotone" dataKey="visitor" fill="url(#colorVisitor)" stroke="none" />
          <Line
            type="monotone"
            dataKey="visitor"
            name="👨‍💻 실제 방문 확인"
            stroke="#10B981"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}