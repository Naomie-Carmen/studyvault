# StudyVault Desktop — Application Tauri

Application desktop native StudyVault développée avec **Tauri** (Rust + React).

## Caractéristiques
- 🚀 **Ultra-léger** (~10-15 Mo contre ~150 Mo avec Electron)
- 🔒 **Chiffrement & Sécurité** native Rust avec CSP restreint
- 🔄 **Mises à jour automatiques** intégrées
- 🎨 **Interface identique au web** (charge le même frontend React)
- 🖥️ **Multi-plateforme** : Windows (.msi / .exe), macOS (.dmg), Linux (.AppImage / .deb)

## Démarrage rapide

### Prérequis
- [Rust 1.75+](https://www.rust-lang.org/)
- Node.js 18+

### Mode Développement
```bash
npm --prefix desktop install
npm --prefix desktop run dev
```

### Build d'Installeur de Production
```bash
npm --prefix desktop run build
```
Les exécutables générés se trouvent dans `desktop/src-tauri/target/release/bundle/`.

## Clé de Signature des Mises à Jour (CI/CD)

Pour signer les mises à jour automatiques en production :
1. Générer une paire de clés : `npx tauri signer generate`
2. Configurer la variable d'environnement secrets GitHub Actions : `TAURI_SIGNING_PRIVATE_KEY`
3. Renseigner la clé publique dans `desktop/src-tauri/tauri.conf.json` (`tauri.updater.pubkey`).
