import { Suspense } from 'react';
import { Board } from '@/components/Board';
import { fetchBoard } from './actions';

// 1. Home 组件：应用的主入口页面，是一个 Server Component
// Reason: 这是一个 Server Component，它在服务器端获取数据并将数据传递给 Client Component (Board)。
export default async function Home() {
  // 2. 在服务端获取看板所需的初始数据
  // fetchBoard 是一个 Server Action，直接从数据库读取数据
  const { statuses, contexts, tasks, dateColumns } = await fetchBoard();

  return (
    // 3. 使用 Suspense 处理加载状态（虽然此处数据是同步获取的，但保留 Suspense 是个好习惯）
    <Suspense fallback={<div>Loading...</div>}>
      {/* 4. 渲染 Board 组件，并将初始数据作为 props 传递 */}
      <Board 
        initialStatuses={statuses} 
        initialContexts={contexts} 
        initialDateColumns={dateColumns}
        initialTasks={tasks} 
      />
    </Suspense>
  );
}
