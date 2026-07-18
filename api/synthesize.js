import { handler } from '../netlify/functions/synthesize.js';
import { adaptNetlifyHandler } from '../vercel-adapter.js';

export default adaptNetlifyHandler(handler);
