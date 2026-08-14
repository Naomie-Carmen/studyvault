import { debugExtractTable } from '../src/utils/debugOcr';

/**
 * Charge un fichier image réel (.jpg, .jpeg, .png) depuis un URL/blob et crée un objet File.
 */
export async function loadImageAsFile(url: string, fileName: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return new File([blob], fileName, { type: mimeType });
}

export function createMockImageFile(name: string, titleText: string, code: string, ueTitle: string, ecueCode: string, ecueTitle: string): File {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 800);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`MAQUETTE PÉDAGOGIQUE - ${titleText}`, 50, 50);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    const hLines = [100, 160, 220, 280, 340, 400, 460, 520, 580];
    hLines.forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(1150, y);
      ctx.stroke();
    });

    const vLines = [50, 180, 450, 580, 850, 910, 970, 1030, 1090, 1150];
    vLines.forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 100);
      ctx.lineTo(x, 580);
      ctx.stroke();
    });

    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('CODE UE', 60, 138);
    ctx.fillText('INTITULE UE', 190, 138);
    ctx.fillText('CODE ECUE', 460, 138);
    ctx.fillText('INTITULE ECUE', 590, 138);
    ctx.fillText('CM', 865, 138);
    ctx.fillText('TD', 925, 138);
    ctx.fillText('TP', 985, 138);
    ctx.fillText('TPE', 1045, 138);
    ctx.fillText('ECTS', 1100, 138);

    ctx.font = '14px sans-serif';
    ctx.fillText(code, 60, 198);
    ctx.fillText(ueTitle, 190, 198);
    ctx.fillText(ecueCode, 460, 198);
    ctx.fillText(ecueTitle, 590, 198);
    ctx.fillText('24', 865, 198);
    ctx.fillText('12', 925, 198);
    ctx.fillText('0', 985, 198);
    ctx.fillText('36', 1045, 198);
    ctx.fillText('3', 1100, 198);

    ctx.fillText(code, 60, 258);
    ctx.fillText(ueTitle, 190, 258);
    ctx.fillText(`${ecueCode}-2`, 460, 258);
    ctx.fillText('Analyse de Risque et Portefeuilles', 590, 258);
    ctx.fillText('18', 865, 258);
    ctx.fillText('18', 925, 258);
    ctx.fillText('0', 985, 258);
    ctx.fillText('39', 1045, 258);
    ctx.fillText('3', 1100, 258);
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const blob = new Blob([u8arr], { type: mime });
  return new File([blob], name, { type: mime });
}

export async function runTestOnSemestres() {
  console.log('[debugOcr] Lancement de l\'analyse des photos réelles (semestre1.jpeg, semestre2.jpeg)...');

  try {
    const sem1 = await loadImageAsFile('/test-images/semestre1.jpeg', 'semestre1.jpeg');
    const sem2 = await loadImageAsFile('/test-images/semestre2.jpeg', 'semestre2.jpeg');

    const res1 = await debugExtractTable(sem1);
    const res2 = await debugExtractTable(sem2);

    return { res1, res2 };
  } catch (_err) {
    console.warn('[debugOcr] Chargement direct URL impossible, utilisation du fallback mock.');
    const sem1 = createMockImageFile('semestre1.jpeg', 'SEMESTRE 1', 'MIF4116', 'Microéconomie Financière 1', 'MIF41151', 'Décision dans l\'Incertain');
    const sem2 = createMockImageFile('semestre2.jpeg', 'SEMESTRE 2', 'MIF4216', 'Finance Internationale', 'MIF42151', 'Econométrie des Séries Temporelles');
    return {
      res1: await debugExtractTable(sem1),
      res2: await debugExtractTable(sem2),
    };
  }
}
