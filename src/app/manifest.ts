import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NoorTech Meetings',
    short_name: 'NoorTech',
    description: 'نظام اجتماعات خاصة لموظفي شركة نور تيك',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon-light.jpg',
        sizes: 'any',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/icon-dark.jpg',
        sizes: 'any',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  };
}
