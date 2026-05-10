import dynamic from 'next/dynamic';

// Force client-side rendering for the 404 page
const NotFound = dynamic(() => Promise.resolve(() => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Página não encontrada</h1>
        <p className="text-gray-600">A página que você está procurando não existe.</p>
      </div>
    </div>
  );
}), { ssr: false });

export default NotFound;