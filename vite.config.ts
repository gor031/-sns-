import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'local-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/search')) {
              try {
                // 파라미터 파싱
                const url = new URL(req.url, `http://${req.headers.host}`);
                const query = url.searchParams.get('query');
                const source = url.searchParams.get('source');

                if (!query || !source) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: 'Missing query or source parameter' }));
                }

                let apiUrl = '';
                let headers = {};

                if (source === 'pexels') {
                  apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=30`;
                  headers = { Authorization: env.PEXELS_API_KEY };
                } else if (source === 'pixabay') {
                  apiUrl = `https://pixabay.com/api/?key=${env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=30&image_type=photo`;
                } else if (source === 'freepik') {
                  apiUrl = `https://api.freepik.com/v1/resources?term=${encodeURIComponent(query)}&limit=30`;
                  headers = { 
                    'Accept-Language': 'en-US', 
                    'Accept': 'application/json', 
                    'x-freepik-api-key': env.FREEPIK_API_KEY 
                  };
                }

                const response = await fetch(apiUrl, { headers });
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }
                const data = await response.json();
                
                let results = [];
                if (source === 'pexels') {
                  results = data.photos.map((p: any) => ({
                    id: String(p.id),
                    preview_url: p.src.medium,
                    full_url: p.src.large2x,
                    title: p.alt || 'Pexels Image',
                    source: 'pexels'
                  }));
                } else if (source === 'pixabay') {
                  results = data.hits.map((p: any) => ({
                    id: String(p.id),
                    preview_url: p.webformatURL,
                    full_url: p.largeImageURL,
                    title: p.tags,
                    source: 'pixabay'
                  }));
                } else if (source === 'freepik') {
                  results = data.data.map((p: any) => ({
                    id: String(p.id),
                    preview_url: p.image?.source?.url || '',
                    full_url: p.image?.source?.url || '',
                    title: p.title || 'Freepik Image',
                    source: 'freepik'
                  })).filter((p: any) => p.preview_url);
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ results }));
              } catch (error: any) {
                console.error('Local proxy error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to fetch images' }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
