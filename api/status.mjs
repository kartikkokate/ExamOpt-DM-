export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  const configured = Boolean(process.env.GROQ_API_KEY || process.env.AI_GATEWAY_API_KEY);
  res.status(200).json({ configured });
}
