'use client';
import { useState, useRef } from 'react';

// 🔥 export function으로 변경
export function BlogWriter({ storeId }: { storeId: string }) {
  // ... 내부 로직 기존과 동일 ...
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("대기 중");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setStatus("AI가 글을 쓰는 중...");
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, topic, images: image ? [image] : [] })
      });
      const result = await res.json();
      if (result.success) {
          setStatus("발행 완료!");
          alert("블로그 생성 완료!");
          setImage(null); setTopic("");
      } else {
          setStatus("실패: " + result.message);
      }
    } catch (e) { setStatus("오류 발생"); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 rounded-3xl shadow-lg text-white">
        <h2 className="text-2xl font-black mb-6">📸 AI 블로그 작가 <span className="text-xs bg-white/20 px-2 py-1 rounded-full">PRO</span></h2>
        <input type="text" value={topic} onChange={(e) => setTopic(topic)} placeholder="주제 입력" className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white mb-4 outline-none" />
        {image && <img src={image} className="h-32 w-full object-cover rounded-xl mb-4" />}
        <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <button onClick={() => fileInputRef.current?.click()} className="bg-white/20 p-4 rounded-xl font-bold">📸</button>
            <button onClick={handleCreate} disabled={loading} className="flex-1 bg-white text-blue-600 font-bold p-4 rounded-xl">
                {loading ? "작성 중..." : "글 발행 🚀"}
            </button>
        </div>
    </div>
  );
}