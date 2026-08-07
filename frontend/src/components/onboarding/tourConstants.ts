import { TourStepData } from './TourStep';

export const TOUR_DONE_KEY = 'studyvault_tour_done';

export const TOUR_STEPS: TourStepData[] = [
  {
    id: 'welcome',
    icon: '👋',
    title: 'Bienvenue sur StudyVault !',
    description:
      'Votre bibliothèque académique personnelle. En quelques étapes, découvrez comment organiser tous vos documents, cours et emplois du temps sans effort.',
    position: 'center',
  },
  {
    id: 'structure',
    icon: '🏗️',
    title: 'Créez votre structure académique',
    description:
      'Renseignez votre université, formation et semestres dans "Profil Académique", puis construisez votre arborescence UE / ECUE / Matières. StudyVault s\'y adapte automatiquement.',
    targetSelector: '[data-tour="academic-structure"]',
  },
  {
    id: 'documents',
    icon: '📁',
    title: 'Importez vos documents',
    description:
      'Glissez-déposez vos PDF, images et autres fichiers. Le moteur de classement analyse le nom et le contenu pour vous suggérer le bon emplacement — vous validez toujours en dernier.',
    targetSelector: '[data-tour="documents"]',
  },
  {
    id: 'search',
    icon: '🔍',
    title: 'Retrouvez tout en un clin d\'œil',
    description:
      'La recherche globale porte sur tous vos documents, tags, matières et semestres en même temps. Filtrez par type, date ou cours pour aller droit au but.',
    targetSelector: '[data-tour="search"]',
  },
  {
    id: 'timetable',
    icon: '📅',
    title: 'Importez votre emploi du temps',
    description:
      'Prenez une photo de votre emploi du temps affiché à la faculté ou importez un PDF — StudyVault extrait automatiquement tous vos créneaux. Vérifiez et confirmez, c\'est prêt.',
    targetSelector: '[data-tour="timetable"]',
  },
  {
    id: 'vault',
    icon: '🔐',
    title: 'Coffre-fort pour vos documents personnels',
    description:
      'CV, lettres de motivation, diplômes, relevés de notes — gardez vos documents personnels dans un espace sécurisé, séparé de vos cours et entièrement privé.',
    targetSelector: '[data-tour="vault"]',
  },
];
