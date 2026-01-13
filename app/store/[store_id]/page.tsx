'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StorePage() {
  const params = useParams();
  const rawStoreId = params?.store_id;
  const storeId = typeof rawStoreId === 'string' ? decodeURIComponent(rawStoreId) : '';

  const [status, setStatus] = useState<any>({ 
    loading: true, 
    idCheck: storeId, 
    dbConnection: 'Checking...',
    rowCount: 0,
    dataFound: null,
    error: null 
  });

  useEffect(() => {
    const runDiagnosis = async () => {
      let result = { ...status, loading: false };

      try {
        // 1. 테이블 전체 개수 세기 (테이블이 비었는지 확인)
        const { count, error: countError } = await supabase
          .from('gangneung_stores')
          .select('*', { count: 'exact', head: true });
        
        if (countError) throw new Error(`테이블 접속 실패: ${countError.message}`);
        result.rowCount = count;

        // 2. 특정 ID로 데이터 찾아보기
        const { data, error: dataError } = await supabase
          .from('gangneung_stores')
          .select('*') 
          .eq('store_id', storeId)
          .maybeSingle();

        if (dataError) throw new Error(`데이터 조회 에러: ${dataError.message}`);
        
        result.dataFound = data ? "✅ 데이터 있음 (성공)" : "❌ 데이터 없음 (NULL)";
        result.dbConnection = "✅ 연결 성공";
        result.record = data; // 실제 가져온 데이터

      } catch (err: any) {
        result.error = err.message;
        result.dbConnection = "❌ 연결/조회 실패";
      }

      setStatus(result);
    };

    runDiagnosis();
  }, [storeId]);

  return (
    <div className="min-h-screen bg-slate-900 text-green-400 p-10 font-mono text-sm">
      <h1 className="text-2xl font-bold text-white mb-6">🕵️‍♂️ 엑스레이 진단 모드</h1>
      
      <div className="border border-green-800 p-6 rounded bg-black/50 space-y-4">
        <div>
          <strong className="text-white block mb-1">1. URL에서 받은 ID:</strong>
          <span className="text-xl bg-blue-900 text-white px-2 py-1">{status.idCheck}</span>
        </div>

        <div>
          <strong className="text-white block mb-1">2. 데이터베이스 연결 상태:</strong>
          <span>{status.dbConnection}</span>
        </div>

        <div>
          <strong className="text-white block mb-1">3. gangneung_stores 테이블 총 데이터 개수:</strong>
          <span className="text-xl text-yellow-400">{status.rowCount} 개</span>
          {status.rowCount === 0 && <p className="text-red-500 font-bold">🚨 경고: 테이블이 비어있습니다! 데이터를 넣어야 합니다.</p>}
        </div>

        <div>
          <strong className="text-white block mb-1">4. 조회 결과:</strong>
          <span className="text-xl">{status.dataFound}</span>
        </div>

        {status.error && (
            <div className="bg-red-900/50 p-4 border border-red-500 text-white">
                <strong>🚨 에러 발생:</strong> {status.error}
                <p className="mt-2 text-sm text-gray-300">
                    * "policy" 관련 에러라면 -> SQL Editor에서 권한 설정 다시 실행<br/>
                    * "relation does not exist"라면 -> 테이블 이름 틀림
                </p>
            </div>
        )}

        {status.record && (
             <div className="bg-green-900/30 p-4 border border-green-500 text-gray-300">
                <strong>📝 가져온 데이터 미리보기:</strong>
                <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(status.record, null, 2)}
                </pre>
            </div>
        )}
      </div>

      <div className="mt-10 text-gray-500 text-xs">
        * 확인 후에는 다시 원래 코드로 복구해야 합니다.
      </div>
    </div>
  );
}