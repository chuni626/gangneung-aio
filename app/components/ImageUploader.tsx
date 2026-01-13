'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function ImageUploader({ storeId, onUploadComplete }: { storeId: string, onUploadComplete: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!e.target.files || e.target.files.length === 0) {
        return;
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('store_images').getPublicUrl(filePath);
      
      alert("✅ 사진이 변경되었습니다!");
      onUploadComplete(data.publicUrl);

    } catch (error: any) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center h-80">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mb-4">📸</div>
      <h3 className="font-bold text-slate-700 mb-2">대표 사진 변경</h3>
      <p className="text-xs text-slate-400 mb-6">매장 메인 이미지를<br/>직접 올릴 수 있습니다.</p>
      
      <label className="cursor-pointer bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg transform hover:-translate-y-1">
        {uploading ? '업로드 중...' : '사진 선택하기'}
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  );
}