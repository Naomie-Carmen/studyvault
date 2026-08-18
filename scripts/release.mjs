import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rawArg = process.argv[2];
if (!rawArg) {
  console.error('❌ Erreur: Veuillez spécifier un numéro de version (ex: npm run release -- 1.1.0)');
  process.exit(1);
}

const version = rawArg.startsWith('v') ? rawArg.slice(1) : rawArg;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`❌ Erreur: Le format de version "${rawArg}" est invalide. Utilisez un format SemVer X.Y.Z (ex: 1.1.0)`);
  process.exit(1);
}

const tag = `v${version}`;
console.log(`🚀 Préparation de la release ${tag}...`);

// 1. Update desktop/src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, 'desktop', 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriContent = fs.readFileSync(tauriConfPath, 'utf8');
  const tauriJson = JSON.parse(tauriContent);
  if (tauriJson.package) {
    tauriJson.package.version = version;
  }
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriJson, null, 2) + '\n', 'utf8');
  console.log(`  ✓ Mis à jour ${path.relative(rootDir, tauriConfPath)} -> ${version}`);
} else {
  console.warn(`  ⚠️ Fichier introuvable: ${tauriConfPath}`);
}

// 2. Update backend/version.json
const backendVersionPath = path.join(rootDir, 'backend', 'version.json');
if (fs.existsSync(backendVersionPath)) {
  const backendContent = fs.readFileSync(backendVersionPath, 'utf8');
  const backendJson = JSON.parse(backendContent);
  const oldVersion = backendJson.version;
  
  if (oldVersion && oldVersion !== version) {
    if (!Array.isArray(backendJson.history)) {
      backendJson.history = [];
    }
    const alreadyInHistory = backendJson.history.some(h => h.version === oldVersion);
    if (!alreadyInHistory) {
      backendJson.history.unshift({
        version: oldVersion,
        releaseDate: backendJson.releaseDate || new Date().toISOString().split('T')[0],
        highlights: backendJson.notes ? [...backendJson.notes] : []
      });
    }
  }

  backendJson.version = version;
  backendJson.releaseDate = new Date().toISOString().split('T')[0];
  backendJson.notes = [
    "Design dark theme professionnel unifié (color-scheme: dark) sur 100% des formulaires et modales",
    "Elimination définitive de tous les widgets blancs natifs du navigateur (select, time pickers, inputs)",
    "Contrôles stylisés avec fond translucide, contour réactif #6C63FF et chevron SVG personnalisé",
    "Modale de séance réorganisée en grille 2 colonnes ultra-propre avec alignement parfait"
  ];

  fs.writeFileSync(backendVersionPath, JSON.stringify(backendJson, null, 2) + '\n', 'utf8');
  console.log(`  ✓ Mis à jour ${path.relative(rootDir, backendVersionPath)} -> ${version}`);
} else {
  console.warn(`  ⚠️ Fichier introuvable: ${backendVersionPath}`);
}

// 3. Git commit, tag & push
const commitMessage = `release: ${tag} — bêta complète (recherche, drag&drop, notes, i18n, import intelligent)`;

try {
  console.log('📦 Git add & commit...');
  execSync('git add desktop/src-tauri/tauri.conf.json backend/version.json package.json', { cwd: rootDir, stdio: 'inherit' });
  execSync(`git commit -m "${commitMessage}"`, { cwd: rootDir, stdio: 'inherit' });
  
  console.log('⬆️ Push de main vers GitHub...');
  execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });

  console.log(`🏷️ Création du tag ${tag}...`);
  try {
    execSync(`git tag ${tag}`, { cwd: rootDir, stdio: 'inherit' });
  } catch (err) {
    console.log(`  (Le tag ${tag} existe déjà localement, mise à jour...)`);
    execSync(`git tag -f ${tag}`, { cwd: rootDir, stdio: 'inherit' });
  }

  console.log(`⬆️ Push du tag ${tag} vers GitHub...`);
  execSync(`git push origin ${tag} --force`, { cwd: rootDir, stdio: 'inherit' });

  const commitHash = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
  console.log('\n======================================================');
  console.log(`✅ Release ${tag} terminée avec succès !`);
  console.log(`📌 Commit Hash: ${commitHash}`);
  console.log(`🏷️ Tag GitHub: ${tag}`);
  console.log(`⚡ Workflow GitHub Actions Desktop Release déclenché.`);
  console.log('======================================================\n');
} catch (error) {
  console.error('❌ Erreur lors des commandes Git:', error.message);
  process.exit(1);
}
