const fs = require('fs');
const path = require('path');

// Chemin du fichier JSON qui stocke les utilisateurs
const DB_PATH = path.join(__dirname, 'users.json');

// Charge les données depuis le fichier JSON (ou retourne un objet vide)
function load() {
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}

// Sauvegarde les données dans le fichier JSON
function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Retourne un utilisateur par prénom, ou null si inexistant
function getUser(name) {
  const db = load();
  return db[name] || null;
}

// Crée un nouvel utilisateur
function createUser(name) {
  const db = load();
  db[name] = {
    name,
    best_score: 0,
    games_played: 0,
    last_seen: new Date().toISOString(),
  };
  save(db);
  return db[name];
}

// Met à jour le meilleur score après une partie
function updateScore(name, score) {
  const db = load();
  if (!db[name]) return null;

  db[name].best_score = Math.max(db[name].best_score, score);
  db[name].games_played += 1;
  db[name].last_seen = new Date().toISOString();

  save(db);
  return db[name];
}

module.exports = { getUser, createUser, updateScore };
