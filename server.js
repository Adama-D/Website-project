const express = require('express');
const path = require('path');
const flashcards = require('./data/flashcards.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse le corps des requêtes JSON
app.use(express.json());

// Sert les fichiers statiques du dossier public/
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes API ---

// Retourner toutes les flashcards
app.get('/api/flashcards', (req, res) => {
  res.json(flashcards);
});

// Proxy Google Translate TTS — évite les problèmes CORS et l'installation de voix Windows
app.get('/api/tts', async (req, res) => {
  const text = req.query.text;
  const lang = ['ar', 'fr'].includes(req.query.lang) ? req.query.lang : 'ar';
  if (!text) return res.status(400).send('Paramètre text manquant');

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&ttsspeed=0.8&q=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) throw new Error('Google TTS indisponible');

    res.set('Content-Type', 'audio/mpeg');
    // Convertit le ReadableStream web en stream Node.js
    const { Readable } = require('stream');
    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error('Erreur TTS:', err.message);
    res.status(502).send('Erreur audio');
  }
});

// Démarrage local uniquement (pas sur Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ ArabiKids tourne sur http://localhost:${PORT}`);
  });
}

// Export pour Vercel (serverless)
module.exports = app;
