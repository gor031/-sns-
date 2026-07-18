import { handler } from '../netlify/functions/generate-card-news.js';
import { adaptNetlifyHandler } from '../vercel-adapter.js';

export default adaptNetlifyHandler(handler);
