export const config = {
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 60, windowSize: 60 },
};

export const handler = async function(event) {
  const { query, source } = event.queryStringParameters || {};

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'GET 요청만 지원합니다.' }) };
  }

  if (!query || !source) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing query or source parameter' })
    };
  }

  const safeQuery = String(query).trim().slice(0, 120);
  let apiUrl = '';
  let headers = {};

  try {
    if (source === 'pexels') {
      if (!process.env.PEXELS_API_KEY) throw new Error('PEXELS_API_KEY is missing');
      apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(safeQuery)}&per_page=30`;
      headers = { Authorization: process.env.PEXELS_API_KEY };
    } else if (source === 'pixabay') {
      if (!process.env.PIXABAY_API_KEY) throw new Error('PIXABAY_API_KEY is missing');
      apiUrl = `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(safeQuery)}&per_page=30&image_type=photo&safesearch=true`;
    } else if (source === 'freepik') {
      if (!process.env.FREEPIK_API_KEY) throw new Error('FREEPIK_API_KEY is missing');
      apiUrl = `https://api.freepik.com/v1/resources?term=${encodeURIComponent(safeQuery)}&limit=30`;
      headers = { 
        'Accept-Language': 'en-US', 
        'Accept': 'application/json', 
        'x-freepik-api-key': process.env.FREEPIK_API_KEY 
      };
    } else {
      return { 
        statusCode: 400, 
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid source' }) 
      };
    }

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
        throw new Error(`API returned ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    
    // 데이터를 공통 포맷으로 정규화: { id, preview_url, full_url, title, source }
    let results = [];
    if (source === 'pexels') {
      results = data.photos.map(p => ({
        id: String(p.id),
        preview_url: p.src.medium,
        full_url: p.src.large2x,
        title: p.alt || 'Pexels Image',
        source: 'pexels'
      }));
    } else if (source === 'pixabay') {
      results = data.hits.map(p => ({
        id: String(p.id),
        preview_url: p.webformatURL,
        full_url: p.largeImageURL,
        title: p.tags,
        source: 'pixabay'
      }));
    } else if (source === 'freepik') {
      results = data.data.map(p => ({
        id: String(p.id),
        preview_url: p.image?.source?.url || '',
        full_url: p.image?.source?.url || '',
        title: p.title || 'Freepik Image',
        source: 'freepik'
      })).filter(p => p.preview_url); // 이미지가 없는 항목 제외
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff'
      },
      body: JSON.stringify({ results })
    };

  } catch (error) {
    console.error(`Error fetching from ${source}:`, error.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: '이미지 검색 요청을 처리하지 못했습니다.' })
    };
  }
};
