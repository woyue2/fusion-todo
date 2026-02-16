import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Polished Fusion Board',
    short_name: 'Fusion',
    description: 'A polished, fusion-style kanban board',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f5f7',
    theme_color: '#f4f5f7',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
