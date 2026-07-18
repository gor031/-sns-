import { handler } from '../netlify/functions/transcribe.js';
import { adaptNetlifyHandler } from '../vercel-adapter.js';

export default adaptNetlifyHandler(handler);
