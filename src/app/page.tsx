import { Suspense } from 'react';
import { Board } from '@/components/Board';
import { fetchBoard } from './actions';

// Reason: This is a Server Component. It fetches data on the server and passes it to the Client Component (Board).
export default async function Home() {
  const { statuses, contexts, tasks } = await fetchBoard();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Board 
        initialStatuses={statuses} 
        initialContexts={contexts} 
        initialTasks={tasks} 
      />
    </Suspense>
  );
}
