import React, { useState, useEffect } from 'react';
import { useAcademic } from '../../context/useAcademic';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Save, 
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { SemesterInput, AcademicProfileInput } from '../../types/validators';

const LEVEL_OPTIONS: AcademicProfileInput['level'][] = [
  'L1',
  'L2',
  'L3',
  'M1',
  'M2',
  'DUT/BUT',
  'BTS',
  'Licence Pro',
  'Doctorat',
  'Autre',
];

interface AcademicProfilePageProps {
  onSuccessSave?: () => void;
}

export const AcademicProfilePage: React.FC<AcademicProfilePageProps> = ({ onSuccessSave }) => {
  const { profile, universities, saveProfile, isLoading } = useAcademic();

  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [level, setLevel] = useState<AcademicProfileInput['level']>('L1');
  const [yearLabel, setYearLabel] = useState('2025-2026');
  const [semesters, setSemesters] = useState<SemesterInput[]>([
    { number: 1, label: 'Semestre 1', isActive: true },
    { number: 2, label: 'Semestre 2', isActive: true },
  ]);

  const [filteredUnivs, setFilteredUnivs] = useState<string[]>([]);
  const [showUnivDropdown, setShowUnivDropdown] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setUniversity(profile.university || '');
      setProgram(profile.program || '');
      if (profile.level) setLevel(profile.level as AcademicProfileInput['level']);
      if (profile.academicYear) {
        setYearLabel(profile.academicYear.yearLabel || '2025-2026');
        if (profile.academicYear.semesters && profile.academicYear.semesters.length > 0) {
          setSemesters(
            profile.academicYear.semesters.map((s) => ({
              number: s.number,
              label: s.label,
              isActive: s.isActive,
            }))
          );
        }
      }
    }
  }, [profile]);

  const handleUniversityChange = (val: string) => {
    setUniversity(val);
    if (val.trim().length > 1) {
      const matches = universities.filter((u) =>
        u.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredUnivs(matches);
      setShowUnivDropdown(true);
    } else {
      setShowUnivDropdown(false);
    }
  };

  const selectUniversity = (name: string) => {
    setUniversity(name);
    setShowUnivDropdown(false);
  };

  const handleAddSemester = () => {
    const nextNum = semesters.length + 1;
    setSemesters([
      ...semesters,
      { number: nextNum, label: `Semestre ${nextNum}`, isActive: true },
    ]);
  };

  const handleRemoveSemester = (index: number) => {
    if (semesters.length <= 1) return;
    const updated = semesters.filter((_, idx) => idx !== index);
    setSemesters(updated);
  };

  const handleToggleSemesterActive = (index: number) => {
    const updated = semesters.map((s, idx) =>
      idx === index ? { ...s, isActive: !s.isActive } : s
    );
    setSemesters(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!university.trim() || !program.trim() || !yearLabel.trim()) {
      setErrorMsg('Veuillez remplir l\'université, la formation et l\'année universitaire.');
      return;
    }

    const result = await saveProfile({
      university: university.trim(),
      program: program.trim(),
      level,
      yearLabel: yearLabel.trim(),
      semesters,
    });

    if (result.success) {
      setSuccessMsg('Profil universitaire enregistré avec succès !');
      if (onSuccessSave) onSuccessSave();
    } else {
      setErrorMsg(result.error || 'Erreur lors de l\'enregistrement.');
    }
  };

  return (
    <div className="academic-profile-container">
      <div className="glass-card profile-card">
        <div className="profile-header">
          <div className="header-badge">
            <Sparkles size={14} />
            <span>Contexte Académique Étudiant</span>
          </div>
          <h2>Maquette Pédagogique & Parcours</h2>
          <p>
            Renseignez votre université et vos semestres pour générer automatiquement l'arborescence de classement.
          </p>
        </div>

        {successMsg && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Établissement / Université */}
          <div className="form-group relative">
            <label htmlFor="university">Université / Établissement d'Enseignement *</label>
            <div className="input-wrapper">
              <GraduationCap className="input-icon" size={18} />
              <input
                id="university"
                type="text"
                placeholder="ex: Sorbonne Université, Paris Cité, IP Paris..."
                value={university}
                onChange={(e) => handleUniversityChange(e.target.value)}
                onFocus={() => university.length > 1 && setShowUnivDropdown(true)}
                required
                disabled={isLoading}
              />
            </div>
            {showUnivDropdown && filteredUnivs.length > 0 && (
              <ul className="univ-dropdown">
                {filteredUnivs.map((u, idx) => (
                  <li key={idx} onClick={() => selectUniversity(u)}>
                    {u}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Formation & Spécialité */}
          <div className="form-group">
            <label htmlFor="program">Intitulé de la Formation / Filière *</label>
            <div className="input-wrapper">
              <BookOpen className="input-icon" size={18} />
              <input
                id="program"
                type="text"
                placeholder="ex: Licence Économie-Gestion, Master Informatique..."
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Niveau & Année Universitaire */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="level">Niveau d'Étude *</label>
              <div className="input-wrapper">
                <Award className="input-icon" size={18} />
                <select
                  id="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as AcademicProfileInput['level'])}
                  required
                  disabled={isLoading}
                >
                  {LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="yearLabel">Année Universitaire *</label>
              <div className="input-wrapper">
                <Calendar className="input-icon" size={18} />
                <input
                  id="yearLabel"
                  type="text"
                  placeholder="2025-2026"
                  value={yearLabel}
                  onChange={(e) => setYearLabel(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Gestion des Semestres */}
          <div className="semesters-section">
            <div className="section-header">
              <div>
                <h4>Semestres de l'Année Académique</h4>
                <p className="subtitle">Activez ou désactivez les semestres selon votre cursus</p>
              </div>
              <button
                type="button"
                className="add-semester-btn"
                onClick={handleAddSemester}
                disabled={isLoading}
              >
                <Plus size={15} />
                <span>Ajouter un Semestre</span>
              </button>
            </div>

            <div className="semesters-grid">
              {semesters.map((sem, idx) => (
                <div
                  key={idx}
                  className={`semester-card ${sem.isActive ? 'active' : 'inactive'}`}
                >
                  <div className="semester-info">
                    <span className="semester-badge">S{sem.number}</span>
                    <input
                      type="text"
                      className="semester-name-input"
                      value={sem.label}
                      onChange={(e) => {
                        const updated = [...semesters];
                        updated[idx].label = e.target.value;
                        setSemesters(updated);
                      }}
                    />
                  </div>

                  <div className="semester-actions">
                    <button
                      type="button"
                      className="toggle-active-btn"
                      onClick={() => handleToggleSemesterActive(idx)}
                      title={sem.isActive ? 'Désactiver le semestre' : 'Activer le semestre'}
                    >
                      {sem.isActive ? (
                        <ToggleRight size={22} className="text-success" />
                      ) : (
                        <ToggleLeft size={22} className="text-muted" />
                      )}
                    </button>

                    {semesters.length > 1 && (
                      <button
                        type="button"
                        className="delete-sem-btn"
                        onClick={() => handleRemoveSemester(idx)}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bouton de Soumission */}
          <button type="submit" className="submit-btn" disabled={isLoading}>
            <Save size={18} />
            <span>{isLoading ? 'Enregistrement en cours...' : 'Enregistrer mon Profil Académique'}</span>
          </button>
        </form>
      </div>

      <style>{`
        .academic-profile-container {
          max-width: 800px;
          margin: 1rem auto;
        }

        .profile-card {
          padding: 2.5rem 2rem;
          background: var(--bg-card);
        }

        .profile-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-full);
          background: rgba(99, 102, 241, 0.12);
          color: var(--primary);
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .profile-header h2 {
          font-size: 1.6rem;
          margin-bottom: 0.35rem;
        }

        .profile-header p {
          font-size: 0.875rem;
          color: var(--text-muted);
          max-width: 580px;
          margin: 0 auto;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        .alert-success {
          background: var(--status-success-bg);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--status-success);
        }

        .alert-error {
          background: var(--status-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--status-error);
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group.relative {
          position: relative;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .form-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        .form-group label {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.875rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-wrapper input,
        .input-wrapper select {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .input-wrapper select {
          cursor: pointer;
          appearance: none;
        }

        .input-wrapper input:focus,
        .input-wrapper select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .univ-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          max-height: 180px;
          overflow-y: auto;
          z-index: 60;
          box-shadow: var(--shadow-lg);
          list-style: none;
        }

        .univ-dropdown li {
          padding: 0.6rem 1rem;
          font-size: 0.85rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .univ-dropdown li:hover {
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
        }

        .semesters-section {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin-top: 0.5rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .section-header h4 {
          font-size: 0.95rem;
        }

        .add-semester-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-md);
          background: rgba(99, 102, 241, 0.12);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.3);
          font-size: 0.775rem;
          font-weight: 600;
        }

        .add-semester-btn:hover {
          background: var(--primary);
          color: #ffffff;
        }

        .semesters-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        @media (min-width: 640px) {
          .semesters-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .semester-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.875rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          transition: border-color var(--transition-fast);
        }

        .semester-card.active {
          border-color: rgba(16, 185, 129, 0.3);
        }

        .semester-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .semester-badge {
          padding: 0.2rem 0.45rem;
          border-radius: var(--radius-sm);
          background: var(--gradient-primary);
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .semester-name-input {
          background: none;
          border: none;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 600;
          outline: none;
          width: 100%;
        }

        .semester-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .delete-sem-btn {
          color: var(--text-muted);
          padding: 0.25rem;
          transition: color var(--transition-fast);
        }

        .delete-sem-btn:hover {
          color: var(--status-error);
        }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.95rem;
          box-shadow: var(--shadow-glow);
          margin-top: 0.75rem;
        }

        .text-success { color: var(--status-success); }
        .text-muted { color: var(--text-muted); }
      `}</style>
    </div>
  );
};
