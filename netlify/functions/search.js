exports.handler = async function(event, context) {
  const { query, source } = event.queryStringParameters || {};

  if (!query || !source) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing query or source parameter' })
    };
  }

  let apiUrl = '';
  let headers = {};

  try {
    if (source === 'pexels') {
      apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=30`;
      headers = { Authorization: process.env.PEXELS_API_KEY };
    } else if (source === 'pixabay') {
      apiUrl = `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=30&image_type=photo`;
    } else if (source === 'freepik') {
      apiUrl = `https://api.freepik.com/v1/resources?term=${encodeURIComponent(query)}&limit=30`;
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
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ results })
    };

  } catch (error) {
    console.error(`Error fetching from ${source}:`, error.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to fetch images' })
    };
  }
};
