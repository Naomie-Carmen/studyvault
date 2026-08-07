import React, { useState } from 'react';
import {
  HelpCircle,
  FileText,
  Calendar,
  Search,
  FolderOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';

const ARTICLES = [
  {
    id: 'import-documents',
    icon: <FileText size={20} />,
    title: 'Comment importer mes premiers documents ?',
    content: `
      <ol>
        <li><strong>Accédez à "Documents Académiques"</strong> depuis la barre latérale gauche.</li>
        <li>Cliquez sur <strong>"Importer un document"</strong> (bouton violet en haut à droite).</li>
        <li>Sélectionnez un ou plusieurs fichiers (PDF, images, Word, Excel…).</li>
        <li>StudyVault analyse automatiquement le nom et le contenu de chaque fichier pour vous proposer un classement.</li>
        <li><strong>Validez ou modifiez</strong> la suggestion de classement — aucun document n'est classé sans votre accord.</li>
        <li>Votre document est maintenant disponible dans l'arborescence de votre formation.</li>
      </ol>
      <p>💡 <em>Conseil : nommez vos fichiers de façon descriptive (ex. "Cours_Algo_S3_TD5.pdf") pour de meilleures suggestions.</em></p>
    `,
  },
  {
    id: 'classification',
    icon: <Brain size={20} />,
    title: 'Comment fonctionne le classement automatique ?',
    content: `
      <p>StudyVault utilise un moteur d'analyse heuristique (sans IA externe) pour vous suggérer où classer vos documents :</p>
      <ol>
        <li><strong>Analyse du nom de fichier</strong> : détection de mots-clés (UE, matière, semestre, type de document).</li>
        <li><strong>Analyse du contenu</strong> : extraction partielle du texte pour détecter la matière concernée.</li>
        <li><strong>Matching contextuel</strong> : comparaison avec votre arborescence académique existante (UE, ECUE, matières).</li>
        <li>Un <strong>score de confiance</strong> (0-100%) vous indique la fiabilité de la suggestion.</li>
      </ol>
      <p>⚠️ <strong>La validation humaine est toujours obligatoire.</strong> Aucun document ne sera jamais classé sans que vous l'ayez confirmé.</p>
    `,
  },
  {
    id: 'timetable',
    icon: <Calendar size={20} />,
    title: 'Comment importer mon emploi du temps ?',
    content: `
      <p>Deux méthodes sont disponibles :</p>
      <h4>Méthode 1 — Import automatique (photo ou PDF)</h4>
      <ol>
        <li>Accédez à <strong>Planning & Emploi du Temps</strong>.</li>
        <li>Cliquez sur <strong>"Importer PDF/Image (OCR)"</strong>.</li>
        <li>StudyVault extrait automatiquement les créneaux (jour, heure, salle, type de cours).</li>
        <li>Vérifiez et confirmez les séances extraites avant de les enregistrer.</li>
      </ol>
      <h4>Méthode 2 — Saisie manuelle</h4>
      <ol>
        <li>Cliquez sur <strong>"Ajouter une séance"</strong>.</li>
        <li>Renseignez la matière, le type (CM/TD/TP), le jour, l'horaire et la salle.</li>
        <li>Enregistrez — la séance apparaît dans la grille hebdomadaire.</li>
      </ol>
    `,
  },
  {
    id: 'vault',
    icon: <FolderOpen size={20} />,
    title: 'Comment organiser mes documents personnels ?',
    content: `
      <p>Le <strong>Coffre-fort Personnel</strong> est un espace séparé de vos documents académiques, conçu pour :</p>
      <ul>
        <li>CV et lettres de motivation</li>
        <li>Diplômes et relevés de notes</li>
        <li>Justificatifs administratifs</li>
        <li>Tout document personnel que vous souhaitez conserver en sécurité</li>
      </ul>
      <p>Accès : <strong>barre latérale → Coffre-fort Personnel</strong>. Vous pouvez importer, prévisualiser, télécharger et supprimer vos documents personnels.</p>
      <p>🔒 Ces documents sont isolés de votre espace académique et ne sont jamais partagés.</p>
    `,
  },
  {
    id: 'search',
    icon: <Search size={20} />,
    title: 'Comment rechercher un document ?',
    content: `
      <p>La <strong>Recherche Globale</strong> vous permet de retrouver n'importe quel document en quelques secondes :</p>
      <ol>
        <li>Cliquez sur l'icône de recherche dans la barre de navigation ou utilisez la page <strong>Recherche</strong>.</li>
        <li>Tapez des mots-clés : nom du cours, type de document, tag, contenu partiel…</li>
        <li>Utilisez les filtres pour affiner : type de fichier, date, semestre, matière.</li>
        <li>Cliquez sur un résultat pour prévisualiser ou télécharger directement.</li>
      </ol>
      <p>💡 La recherche porte simultanément sur les documents académiques et le coffre-fort personnel.</p>
    `,
  },
];

const FAQ_ITEMS = [
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Toutes vos données sont chiffrées en transit (HTTPS) et stockées sur des serveurs sécurisés. Seul vous avez accès à vos documents. Consultez la page "Mes Données" pour plus de détails.',
  },
  {
    q: 'Puis-je utiliser StudyVault sur mobile ?',
    a: "Oui ! L'interface est entièrement responsive et fonctionne sur smartphone et tablette. L'application desktop est également disponible pour Windows, macOS et Linux.",
  },
  {
    q: 'Quels types de fichiers sont supportés ?',
    a: 'PDF, images (JPG, PNG, WEBP, GIF), documents Office (Word, Excel, PowerPoint), fichiers texte (TXT, MD) et vidéos. La taille maximale par fichier est de 50 Mo.',
  },
  {
    q: 'Est-ce que StudyVault utilise une IA pour lire mes documents ?',
    a: "StudyVault utilise uniquement un moteur d'analyse heuristique local (sans service IA externe) pour suggérer un classement. Vos documents ne sont jamais envoyés à une IA tiers. Vous validez toujours chaque suggestion.",
  },
  {
    q: 'Comment récupérer l\'intégralité de mes données ?',
    a: 'Accédez à Paramètres → Confidentialité et cliquez sur "Télécharger mon archive complète". Vous recevez un fichier JSON contenant toutes vos données (profil, structure académique, métadonnées des documents, emploi du temps).',
  },
  {
    q: 'Comment supprimer mon compte ?',
    a: "Accédez à Paramètres → Confidentialité → \"Supprimer mon compte\". Votre compte est désactivé immédiatement et vos données supprimées définitivement sous 30 jours (conformément à l'article 17 du RGPD).",
  },
  {
    q: 'Puis-je avoir plusieurs semestres actifs simultanément ?',
    a: 'Oui ! Lors de la configuration de votre profil académique, vous pouvez activer autant de semestres que nécessaire et les basculer à tout moment.',
  },
  {
    q: "L'emploi du temps détecte-t-il automatiquement les conflits ?",
    a: 'Oui. StudyVault détecte les chevauchements de créneaux et les signale avec une icône d\'avertissement orangée. Aucun cours conflictuel n\'est bloqué — vous décidez.',
  },
  {
    q: 'Comment fonctionne la mise à jour automatique sur desktop ?',
    a: "L'application desktop vérifie silencieusement les mises à jour à chaque démarrage. Si une mise à jour est disponible, une notification discrète apparaît. Vous pouvez l'installer en un clic sans réinstallation complète.",
  },
  {
    q: 'Mon document a été mal classé, que faire ?',
    a: 'Ouvrez le modal de classement depuis le widget "Documents non classés" du tableau de bord. Vous pouvez modifier la suggestion (choisir la bonne matière) puis valider. Vous pouvez aussi rejeter la suggestion et classer manuellement.',
  },
];

const HelpCenterPage: React.FC = () => {
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="help-center-page">
      {/* Header */}
      <div className="help-header">
        <div className="help-header-icon">
          <HelpCircle size={28} />
        </div>
        <div>
          <h2>Centre d'Aide StudyVault</h2>
          <p className="help-subtitle">Guides, tutoriels et questions fréquentes pour maîtriser StudyVault.</p>
        </div>
      </div>

      {/* Articles */}
      <section className="help-section">
        <h3>
          <BookOpen size={18} />
          Guides pratiques
        </h3>
        <div className="articles-list">
          {ARTICLES.map((article) => (
            <div
              key={article.id}
              className={`article-card glass-card ${openArticle === article.id ? 'open' : ''}`}
            >
              <button
                className="article-header"
                onClick={() => setOpenArticle(openArticle === article.id ? null : article.id)}
                id={`help-article-${article.id}`}
              >
                <span className="article-icon">{article.icon}</span>
                <span className="article-title">{article.title}</span>
                {openArticle === article.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openArticle === article.id && (
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="help-section">
        <h3>
          <HelpCircle size={18} />
          Questions fréquentes
        </h3>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className={`faq-item glass-card ${openFaq === idx ? 'open' : ''}`}>
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                id={`faq-item-${idx}`}
              >
                <span>{item.q}</span>
                {openFaq === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openFaq === idx && <p className="faq-answer">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .help-center-page { display: flex; flex-direction: column; gap: 2rem; max-width: 860px; margin: 0 auto; }

        .help-header { display: flex; align-items: center; gap: 1rem; }
        .help-header-icon { width: 52px; height: 52px; border-radius: var(--radius-lg); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: var(--shadow-glow); }
        .help-header h2 { font-size: 1.4rem; font-weight: 800; }
        .help-subtitle { font-size: 0.85rem; color: var(--text-muted); }

        .help-section { display: flex; flex-direction: column; gap: 0.85rem; }
        .help-section h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }

        /* Articles */
        .articles-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .article-card { border-radius: var(--radius-lg); overflow: hidden; transition: border-color 0.2s ease; }
        .article-card.open { border-color: rgba(99,102,241,0.4); }
        .article-header { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem; text-align: left; cursor: pointer; }
        .article-header:hover { background: rgba(255,255,255,0.03); }
        .article-icon { color: var(--primary); flex-shrink: 0; }
        .article-title { flex: 1; font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
        .article-content { padding: 0 1rem 1rem 1rem; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.75; border-top: 1px solid var(--border-color); }
        .article-content ol, .article-content ul { padding-left: 1.5rem; margin: 0.5rem 0; }
        .article-content li { margin-bottom: 0.35rem; }
        .article-content h4 { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0.75rem 0 0.35rem; }
        .article-content p { margin: 0.5rem 0; }
        .article-content strong { color: var(--text-primary); }

        /* FAQ */
        .faq-list { display: flex; flex-direction: column; gap: 0.4rem; }
        .faq-item { border-radius: var(--radius-md); overflow: hidden; }
        .faq-item.open { border-color: rgba(99,102,241,0.3); }
        .faq-question { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.8rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); cursor: pointer; }
        .faq-question:hover { background: rgba(255,255,255,0.03); }
        .faq-answer { padding: 0 1rem 0.9rem 1rem; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.7; border-top: 1px solid var(--border-color); }
      `}</style>
    </div>
  );
};

export default HelpCenterPage;
