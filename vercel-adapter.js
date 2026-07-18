const readBody = async (req) => {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body));
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

export const adaptNetlifyHandler = (handler) => async (req, res) => {
  const body = ['GET', 'HEAD'].includes(req.method) ? Buffer.alloc(0) : await readBody(req);
  const contentType = String(req.headers['content-type'] || '');
  const isBinary = body.length > 0 && !contentType.includes('json') && !contentType.startsWith('text/');
  const queryStringParameters = Object.fromEntries(
    Object.entries(req.query || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  const result = await handler({
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters,
    body: isBinary ? body.toString('base64') : body.toString('utf8'),
    isBase64Encoded: isBinary,
  });

  for (const [name, value] of Object.entries(result.headers || {})) {
    res.setHeader(name, value);
  }
  res.status(result.statusCode || 200).send(result.body || '');
};
