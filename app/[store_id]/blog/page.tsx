import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function BlogListPage({ params }: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await params;
  
  const supabase = createClient(
    "https://lmbiklnpcaltrkarqhmg.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYmlrbG5wY2FsdHJrYXJxaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMjk5MDMsImV4cCI6MjA4MjkwNTkwM30.QyVa1fjB-JyGhcvv4OPpvaziICOOO6_Fey4fPJKvugc"
  );

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('store_id', store_id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-white text-black p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black mb-8 border-b pb-4">📝 {store_id} 공식 블로그</h1>
        
        {posts && posts.length > 0 ? (
          <div className="space-y-16">
            {posts.map((post) => (
              <article key={post.id} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
                
                <div className="flex items-center gap-2 mb-6">
                   <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">New</span>
                   <span className="text-slate-400 text-sm">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>

                <h2 className="text-2xl font-bold mb-6 text-slate-900 leading-tight">{post.title}</h2>

                {/* 📸 여기가 핵심! 이미지가 있으면 무조건 출력 */}
                {post.images && post.images.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-4 mb-8">
                    {post.images.map((imgStr: string, idx: number) => (
                      <img 
                        key={idx} 
                        src={imgStr} 
                        alt={`Blog image ${idx}`} 
                        className="h-64 rounded-2xl shadow-md object-cover flex-shrink-0"
                      />
                    ))}
                  </div>
                ) : (
                  // 이미지가 없으면 디버깅용 메시지 (나중에 지우셔도 됨)
                  <p className="text-xs text-red-300 mb-4 hidden">*이미지 데이터 없음</p>
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
          <div className="text-center py-20 bg-slate-50 text-slate-400">작성된 글이 없습니다.</div>
        )}
      </div>
    </main>
  );
}