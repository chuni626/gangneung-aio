'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🆕 'currentImage'라는 재료(Prop)를 받을 수 있게 수정했습니다.
export function ImageUploader({ 
  storeId, 
  currentImage, // 현재 저장된 이미지 주소 받기
  onUploadComplete 
}: { 
  storeId: string, 
  currentImage?: string | null, 
  onUploadComplete: (url: string) => void 
}) {
  const [uploading, setUploading] = useState(false);
  // 화면에 보여줄 이미지 상태 (처음엔 DB에 저장된 걸로 시작)
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  // 부모(AdminPage)에서 이미지를 다시 주면(새로고침 등) 반영
  useEffect(() => {
    if (currentImage) setPreview(currentImage);
  }, [currentImage]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      // 파일명 뒤에 난수를 붙여서 겹침 방지
      const fileName = `${storeId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 업로드된 주소 가져오기
      const { data } = supabase.storage.from('store_images').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // 1. 화면에 즉시 반영 (프리뷰)
      setPreview(publicUrl);
      
      // 2. 부모에게 알림
      onUploadComplete(publicUrl);
      alert("✅ 사진이 변경되었습니다!");

    } catch (error: any) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center h-full min-h-[320px] relative overflow-hidden group">
      
      {/* 🖼️ 1. 이미지가 있을 때: 사진을 보여줌 */}
      {preview ? (
        <>
          <img 
            src={preview} 
            alt="매장 대표 사진" 
            className="absolute inset-0 w-full h-full object-cover rounded-3xl"
          />
          {/* 마우스 올리면 수정 버튼 등장 */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
             <label className="cursor-pointer bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all shadow-lg transform hover:-translate-y-1">
                {uploading ? '변경 중...' : '📸 사진 변경하기'}
                <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
             </label>
          </div>
        </>
      ) : (
        /* 🌑 2. 이미지가 없을 때: 업로드 버튼 보여줌 */
        <>
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mb-4">📸</div>
          <h3 className="font-bold text-slate-700 mb-2">대표 사진 등록</h3>
          <p className="text-xs text-slate-400 mb-6">매장 메인 이미지를<br/>올려주세요.</p>
          
          <label className="cursor-pointer bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg transform hover:-translate-y-1">
            {uploading ? '업로드 중...' : '사진 선택하기'}
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        </>
      )}
    </div>
  );
}