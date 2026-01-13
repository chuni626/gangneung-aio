'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function ImageUploader({ 
  storeId, 
  currentImage, 
  onUploadComplete 
}: { 
  storeId: string, 
  currentImage?: string | null, 
  onUploadComplete: (url: string) => void 
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  useEffect(() => {
    if (currentImage) setPreview(currentImage);
  }, [currentImage]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      setUploading(true); // "변경 중..." 시작

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Storage 업로드
      const { error: uploadError } = await supabase.storage
        .from('store_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('store_images').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // 2. 화면 미리보기 즉시 변경
      setPreview(publicUrl);
      
      // 3. 부모에게 전달 (여기서 DB 저장이 일어납니다)
      await onUploadComplete(publicUrl);
      
      alert("✅ 사진이 변경되었습니다!");

    } catch (error: any) {
      console.error(error);
      alert('업로드 중 에러가 발생했습니다. DB 칸 설정을 확인해주세요.');
    } finally {
      setUploading(false); // 🚨 실패하든 성공하든 "변경 중..."을 해제합니다.
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center h-full min-h-[320px] relative overflow-hidden group">
      {preview ? (
        <>
          <img src={preview} className="absolute inset-0 w-full h-full object-cover rounded-3xl" alt="미리보기" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
             <label className="cursor-pointer bg-white text-slate-900 px-6 py-3 rounded-xl font-bold shadow-lg">
                {uploading ? '🔄 변경 중...' : '📸 사진 변경하기'}
                <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
             </label>
          </div>
        </>
      ) : (
        <label className="cursor-pointer bg-slate-100 p-10 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center">
            <span className="text-4xl mb-2">📷</span>
            <span className="font-bold text-slate-500">{uploading ? '업로드 중...' : '사진 등록하기'}</span>
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      )}
    </div>
  );
}