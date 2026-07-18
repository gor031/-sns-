import { handler } from '../netlify/functions/search.js';
import { adaptNetlifyHandler } from '../vercel-adapter.js';

export default adaptNetlifyHandler(handler);
