import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      minify: false,
    },
    plugins: [
      tailwindcss(),
      react(),
      // html2canvas가 color(display-p3 ...) 함수를 파싱하지 못하는 문제를 해결하기 위해
      // 빌드된 CSS에서 @supports (color: color(display-p3 ...)) 블록 전체를 제거합니다.
      // display-p3 는 와이드 가뮤 컬러로 일반 모니터에서는 sRGB 폴백(이미 정의됨)과 동일하게 보입니다.
      {
        name: 'strip-display-p3-colors',
        enforce: 'post' as const,
        generateBundle(_options: any, bundle: any) {
          for (const fileName in bundle) {
            const chunk = bundle[fileName];
            if (chunk.type === 'asset' && fileName.endsWith('.css') && typeof chunk.source === 'string') {
              // @supports (color: color(display-p3 ...)) { ... } 블록 전체 제거
              chunk.source = chunk.source.replace(
                /@supports\s*\(color:\s*color\(display-p3[^)]*\)\)\s*\{[^}]*\{[^}]*\}[^}]*\}/gs,
                '/* display-p3 wide-gamut colors stripped for html2canvas compatibility */'
              );
              // 혹시 남은 개별 color(display-p3 ...) 값도 안전하게 rgb(0,0,0) 으로 폴백
              chunk.source = chunk.source.replace(
                /color\(display-p3\s+[^)]*\)/g,
                'rgb(0, 0, 0)'
              );
              // html2canvas가 color-mix(in oklab, ...) 파싱 중 oklab 키워드에서 터지는 문제 해결
              // color-mix(in oklab, X Y%, transparent) -> X 로 대체 (알파 채널은 손실되지만 크래시 방지)
              chunk.source = chunk.source.replace(
                /color-mix\(\s*in\s+oklab\s*,\s*(var\([^)]+\)|[a-zA-Z]+|#[0-9a-fA-F]+)[\s\S]*?,\s*transparent\s*\)/g,
                '$1'
              );
              // 혹시 다른 곳에 남은 "in oklab" 도 제거 (예: gradient position)
              chunk.source = chunk.source.replace(/\s+in\s+oklab/g, '');
            }
          }
        }
      },
      {
        name: 'local-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/favicon.ico') {
              res.statusCode = 302;
              res.setHeader('Location', '/favicon.svg');
              res.end();
            } else if (req.url?.startsWith('/api/extract')) {
              try {
                const url = new URL(req.url, `http://${req.headers.host}`);
                const mode = url.searchParams.get('mode') || 'object-extract';
                const chunks: Buffer[] = [];

                req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
                req.on('end', async () => {
                  try {
                    const response = await fetch(
                      `https://gabjagi031--cardnews-ai-backend-v2-fastapi-app.modal.run/extract?mode=${encodeURIComponent(mode)}`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': String(req.headers['content-type'] || ''),
                        },
                        body: Buffer.concat(chunks) as any,
                      }
                    );

                    const body = Buffer.from(await response.arrayBuffer());
                    res.statusCode = response.status;
                    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
                    res.end(body);
                  } catch (error: any) {
                    console.error('AI extract proxy error:', error);
                    res.statusCode = 502;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: error?.message || 'AI backend request failed' }));
                  }
                });

                req.on('error', (error) => {
                  console.error('AI extract upload error:', error);
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Failed to read uploaded image' }));
                });
              } catch (error: any) {
                console.error('AI extract proxy setup error:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to proxy AI extraction request' }));
              }
            } else if (req.url?.startsWith('/api/search')) {
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
