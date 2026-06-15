// ===== ÉTAT GLOBAL =====
const state = {
  user:      null,   // profil de l'utilisateur connecté
  cards:     [],     // toutes les flashcards (chargées une fois)
  queue:     [],     // les cartes de la session en cours
  current:   0,      // index de la carte actuelle
  score:     0,      // score de la session
  answered:  false,  // empêche de cliquer 2 fois sur la même carte
  category:  'all',  // catégorie sélectionnée ('all' = aléatoire)
};

const CARDS_PER_GAME = 10;

// Emoji associé à chaque catégorie
const CATEGORY_META = {
  animaux:    { emoji: '🐾', label: 'Animaux' },
  fruits:     { emoji: '🍎', label: 'Fruits & Légumes' },
  couleurs:   { emoji: '🎨', label: 'Couleurs' },
  chiffres:   { emoji: '🔢', label: 'Chiffres' },
  ustensiles: { emoji: '🍴', label: 'Ustensiles' },
  nourriture: { emoji: '🍞', label: 'Nourriture' },
  maison:     { emoji: '🏠', label: 'Maison' },
  corps:      { emoji: '✋', label: 'Corps' },
  'vêtements':{ emoji: '👕', label: 'Vêtements' },
  transport:  { emoji: '🚗', label: 'Transport' },
  'école':    { emoji: '📚', label: 'École' },
  famille:    { emoji: '❤️', label: 'Famille' },
  nature:     { emoji: '🌳', label: 'Nature' },
};

// ===== SÉLECTEURS =====
const views = {
  home:       document.getElementById('view-home'),
  categories: document.getElementById('view-categories'),
  game:       document.getElementById('view-game'),
  result:     document.getElementById('view-result'),
};

const $ = (id) => document.getElementById(id);

// ===== NAVIGATION ENTRE VUES =====
function showView(name) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[name].classList.remove('hidden');
}

// ===== GESTION UTILISATEUR (localStorage) =====
function getOrCreateUser(name) {
  const key = `arabikids_${name.toLowerCase()}`;
  let user = JSON.parse(localStorage.getItem(key) || 'null');
  if (!user) {
    user = { name, best_score: 0 };
    localStorage.setItem(key, JSON.stringify(user));
  }
  return user;
}

function saveUserScore(name, score) {
  const key = `arabikids_${name.toLowerCase()}`;
  let user = JSON.parse(localStorage.getItem(key) || 'null') || { name, best_score: 0 };
  if (score > user.best_score) {
    user.best_score = score;
    localStorage.setItem(key, JSON.stringify(user));
  }
  return user;
}

// ===== ACCUEIL =====
$('btn-start').addEventListener('click', async () => {
  const name = $('input-name').value.trim();
  const errorEl = $('home-error');

  if (name.length < 2) {
    errorEl.textContent = 'Écris au moins 2 lettres 😊';
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');

  try {
    // Utilisateur géré localement
    state.user = getOrCreateUser(name);

    // Charge les flashcards depuis le serveur si nécessaire
    if (state.cards.length === 0) {
      const fc = await fetch('/api/flashcards');
      state.cards = await fc.json();
    }

    showCategories();
  } catch (e) {
    errorEl.textContent = 'Erreur de connexion, réessaie !';
    errorEl.classList.remove('hidden');
  }
});

$('input-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('btn-start').click();
});

// ===== VUE CATÉGORIES =====
function showCategories() {
  // Message de bienvenue
  $('welcome-name').textContent = `Bonjour ${state.user.name} ! 👋`;

  // Comptage par catégorie
  const counts = {};
  state.cards.forEach(c => {
    counts[c.category] = (counts[c.category] || 0) + 1;
  });

  // Bouton aléatoire
  $('count-all').textContent = `${state.cards.length} cartes`;
  $('btn-random') .onclick = () => startGame('all');

  // Génère les boutons de catégories
  const grid = $('categories-grid');
  grid.innerHTML = '';

  Object.entries(counts).forEach(([cat, count]) => {
    const meta = CATEGORY_META[cat] || { emoji: '📂', label: cat };
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `
      <span class="cat-emoji">${meta.emoji}</span>
      <span class="cat-name">${meta.label}</span>
      <span class="cat-count">${count} cartes</span>
    `;
    btn.addEventListener('click', () => startGame(cat));
    grid.appendChild(btn);
  });

  showView('categories');
}

// ===== DÉMARRAGE DU JEU =====
async function startGame(category = state.category) {
  state.category = category;

  // Filtre les cartes selon la catégorie choisie
  const pool = category === 'all'
    ? state.cards
    : state.cards.filter(c => c.category === category);

  // Prend jusqu'à 10 cartes mélangées
  state.queue   = shuffle([...pool]).slice(0, Math.min(CARDS_PER_GAME, pool.length));
  state.current = 0;
  state.score   = 0;

  // Label catégorie affiché pendant le jeu
  const meta = CATEGORY_META[category] || { emoji: '🎲', label: 'Aléatoire' };
  $('game-category-label').textContent = category === 'all'
    ? '🎲 Mode aléatoire'
    : `${meta.emoji} ${meta.label}`;

  showView('game');
  renderCard();
}

// ===== AFFICHER UNE CARTE =====
function renderCard() {
  state.answered = false;

  const card = state.queue[state.current];
  const total = state.queue.length;

  // Mise à jour compteur et barre de progression
  $('card-counter').textContent = `Carte ${state.current + 1} / ${total}`;
  $('progress-bar').style.width = `${(state.current / total) * 100}%`;
  $('score-display').textContent = `${state.score} ⭐`;

  // Image / emoji
  const emojiEl = $('card-emoji');
  emojiEl.textContent = card.emoji;
  // Applique le masque silhouette si la carte a des traits du visage
  if (card.masked) {
    emojiEl.classList.add('emoji-masked');
  } else {
    emojiEl.classList.remove('emoji-masked');
  }
  $('card-fr').textContent = card.fr;

  // Masquer le feedback
  const feedbackEl = $('feedback');
  feedbackEl.className = 'feedback hidden';
  feedbackEl.textContent = '';

  // Générer les 4 choix (1 correct + 3 distracteurs)
  const choices = generateChoices(card);
  const grid = $('choices');
  grid.innerHTML = '';

  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice.ar;
    btn.setAttribute('dir', 'rtl');
    btn.addEventListener('click', () => handleAnswer(btn, choice, card));
    grid.appendChild(btn);
  });

  // Prononciation automatique : français puis arabe
  setTimeout(() => speakCard(card), 400);
}

// Messages de félicitation arabes (tirés aléatoirement)
const BRAVO_MESSAGES = [
  'أحسنت',      // Bien fait !
  'ممتاز',      // Excellent !
  'رائع',       // Magnifique !
  'صحيح',       // Correct !
  'عظيم',       // Super !
];

// Messages d'encouragement pour les mauvaises réponses
const TRY_AGAIN_MESSAGES = [
  'حاول مرة أخرى',        // Essaie encore une fois
  'لا بأس، حاول مجدداً',  // Pas de souci, réessaie
  'استمر في المحاولة',    // Continue d'essayer
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== GÉRER LA RÉPONSE =====
function handleAnswer(btn, choice, card) {
  if (state.answered) return;
  state.answered = true;

  const correct = choice.ar === card.ar;
  const feedbackEl = $('feedback');

  // Désactiver tous les boutons
  document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);

  if (correct) {
    btn.classList.add('correct');
    feedbackEl.textContent = '✅ Bravo ! C\'est exact !';
    feedbackEl.className = 'feedback correct';
    state.score++;

    // Message vocal de félicitation en arabe
    speak(randomFrom(BRAVO_MESSAGES));
  } else {
    btn.classList.add('wrong');
    feedbackEl.textContent = `❌ C'était : ${card.ar}`;
    feedbackEl.className = 'feedback wrong';

    // Montrer la bonne réponse en vert
    document.querySelectorAll('.choice-btn').forEach(b => {
      if (b.textContent === card.ar) b.classList.add('correct');
    });

    // Message vocal d'encouragement, puis prononce la bonne réponse
    speak(randomFrom(TRY_AGAIN_MESSAGES));
    setTimeout(() => speak(card.ar), 1600);
  }

  // Passer à la carte suivante après 2.4 secondes (un peu plus long pour laisser l'audio finir)
  setTimeout(() => {
    state.current++;
    if (state.current < state.queue.length) {
      renderCard();
    } else {
      endGame();
    }
  }, 2400);
}

// ===== FIN DE PARTIE =====
async function endGame() {
  // Mettre à jour la barre à 100%
  $('progress-bar').style.width = '100%';

  // Sauvegarder le score localement
  const updatedUser = saveUserScore(state.user.name, state.score);
  state.user = updatedUser;

  // Afficher les résultats
  const total = state.queue.length;
  const score = state.score;
  const pct = Math.round((score / total) * 100);

  // Niveaux de gratification selon le score
  let emoji, titre, voiceMsg;

  if (score === total) {
    // Score parfait
    emoji    = '🏆';
    titre    = 'Score parfait !';
    voiceMsg = 'مبروك، أنت بطل';   // Félicitations, tu es un champion !
  } else if (pct >= 80) {
    // 8-9 / 10
    emoji    = '🌟';
    titre    = 'Excellent !';
    voiceMsg = 'ممتاز جداً، أحسنت'; // Très excellent, bien fait !
  } else if (pct >= 60) {
    // 6-7 / 10
    emoji    = '😊';
    titre    = 'Très bien !';
    voiceMsg = 'جيد، استمر هكذا';   // Bien, continue comme ça !
  } else if (pct >= 40) {
    // 4-5 / 10
    emoji    = '💪';
    titre    = 'Pas mal !';
    voiceMsg = 'لا بأس، حاول مرة أخرى'; // Pas de souci, réessaie !
  } else {
    // 0-3 / 10
    emoji    = '📚';
    titre    = 'Continue d\'apprendre !';
    voiceMsg = 'تدرب أكثر، ستنجح';  // Entraîne-toi plus, tu réussiras !
  }

  $('result-emoji').textContent = emoji;
  $('result-title').textContent = titre;

  // Message vocal de fin après un court délai
  setTimeout(() => speak(voiceMsg), 600);
  $('result-score').textContent = `${state.score} / ${total} bonnes réponses (${pct}%)`;
  $('result-best').textContent = `🏆 Meilleur score : ${updatedUser.best_score} / ${total}`;

  showView('result');
}

// ===== PRONONCIATION (via proxy Google TTS) =====

// Un seul élément audio réutilisé pour éviter les chevauchements
const audioPlayer = new Audio();

function speak(text, lang = 'ar') {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  audioPlayer.src = `/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
  audioPlayer.play().catch(() => {
    console.info('Autoplay bloqué, utilise le bouton 🔊');
  });
}

// Prononce le mot français puis l'arabe avec un enchaînement
function speakCard(card) {
  speak(card.fr, 'fr');
  setTimeout(() => speak(card.ar, 'ar'), 1400);
}

// Bouton écouter manuel
$('btn-listen').addEventListener('click', () => {
  const card = state.queue[state.current];
  if (card) speakCard(card);
});

// ===== QUITTER LE JEU =====
$('btn-quit').addEventListener('click', () => {
  if (confirm('Quitter la partie en cours ?')) {
    showCategories();
  }
});

// ===== REJOUER (même catégorie) =====
$('btn-replay').addEventListener('click', () => startGame(state.category));

// ===== RETOUR CATÉGORIES =====
$('btn-categories').addEventListener('click', () => showCategories());

// ===== RETOUR ACCUEIL =====
$('btn-home').addEventListener('click', () => {
  $('input-name').value = state.user ? state.user.name : '';
  showView('home');
});

// ===== UTILITAIRES =====

// Mélange un tableau aléatoirement (algorithme Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Génère 4 choix : 1 correct + 3 distracteurs aléatoires
function generateChoices(correctCard) {
  const distractors = state.cards
    .filter(c => c.ar !== correctCard.ar)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return shuffle([correctCard, ...distractors]);
}
