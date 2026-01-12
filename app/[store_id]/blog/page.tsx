"use client"; // 클라이언트 컴포넌트로 전환 (useEffect 사용 위해)
import { useState, useEffect, use } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BlogListPage({ params }: { params: Promise<{ store_id: string }> }) {
  // params 언래핑 (Next.js 15 대응)
  const resolvedParams = use(params);
  const store_id = resolvedParams.store_id;
  const decodedStoreId = decodeURIComponent(store_id);

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. 블로그 글 가져오기
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('store_id', decodedStoreId)
        .order('created_at', { ascending: false });
      
      if (data) setPosts(data);
      setLoading(false);
    };

    // 2. 🔥 [핵심] 방문자수 카운팅 (몰래 실행)
    const trackVisit = async () => {
      await fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: decodedStoreId, url: window.location.href })
      });
      console.log(`👀 방문자 카운트 +1 (Store: ${decodedStoreId})`);
    };

    fetchPosts();
    trackVisit();
  }, [decodedStoreId]);

  return (
    <main className="min-h-screen bg-white text-black p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black mb-8 border-b pb-4">📝 {decodedStoreId} 공식 블로그</h1>
        
        {loading ? (
           <div className="py-20 text-center text-gray-400">글 불러오는 중...</div>
        ) : posts.length > 0 ? (
          <div className="space-y-16">
            {posts.map((post) => (
              <article key={post.id} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                   <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">New</span>
                   <span className="text-slate-400 text-sm">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 leading-tight">{post.title}</h2>
                {post.images && post.images.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto pb-4 mb-8">
                    {post.images.map((imgStr: string, idx: number) => (
                      <img key={idx} src={imgStr} alt="img" className="h-64 rounded-2xl shadow-md object-cover flex-shrink-0"/>
                    ))}
                  </div>
                )}
                <div className="prose prose-slate max-w-none text-slate-700 leading-loose whitespace-pre-wrap">
                  {post.content}
                </div>
                <div className="mt-8 pt-6 border-t border-slate-200 flex gap-2 flex-wrap">
                  {Array.isArray(post.keywords) && post.keywords.map((k: string, i: number) => (
                    <span key={i} className="text-xs text-slate-500 bg-white border px-2 py-1 rounded-lg">#{k}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 text-slate-400">
            <p className="text-xl font-bold mb-2">작성된 글이 없습니다.</p>
            <p className="text-sm">관리자 페이지에서 'AI 블로그 작가'를 실행해 보세요.</p>
          </div>
        )}
      </div>
    </main>
  );
}