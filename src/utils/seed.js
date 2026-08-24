/**
 * Jeu de données d'origine, importé depuis Salaire_Juillet_Correction.xlsm
 * (onglets « effectif » et « Heures prestées »). Utilisé par le seeder PHP.
 */

export const seedEmployees = [
  { id: 'e1', nom: 'BALUMUENE', prenom: 'FRANCIS', perception: 'VB', salaireInitial: 500, compteBancaire: '35101-01237473001-75' },
  { id: 'e2', nom: 'BEYA', prenom: 'EUNICE', perception: 'VB', salaireInitial: 400, compteBancaire: '0000101-00925030355' },
  { id: 'e3', nom: 'BOMPELE', prenom: 'CARLA', perception: 'VB', salaireInitial: 700, compteBancaire: '0123-7445001-73' },
  { id: 'e4', nom: 'ENGANI', prenom: 'NEISSE', perception: 'CASH', salaireInitial: 600, compteBancaire: '' },
  { id: 'e5', nom: 'KANDOLO', prenom: 'NAOMIE', perception: 'CASH', salaireInitial: 650, compteBancaire: '' },
  { id: 'e6', nom: 'LISASI', prenom: 'KASTIN', perception: 'VB', salaireInitial: 500, compteBancaire: '25130-01196715001-37' },
  { id: 'e7', nom: 'LUTALA', prenom: 'SYLVAIN', perception: 'VB', salaireInitial: 1000, compteBancaire: '05100-01198856001-11' },
  { id: 'e8', nom: 'MANZINGA', prenom: 'SEBASTIEN', perception: 'CASH', salaireInitial: 800, compteBancaire: '' },
  { id: 'e9', nom: 'MOLEKA', prenom: 'PRISCA', perception: 'VB', salaireInitial: 650, compteBancaire: '00008-01201561001-91' },
  { id: 'e10', nom: 'MONYAWANGERE', prenom: 'GUSTAVE', perception: 'CASH', salaireInitial: 500, compteBancaire: '' },
  { id: 'e11', nom: 'MULOPO', prenom: 'DESIRE', perception: 'VB', salaireInitial: 2300, compteBancaire: '95101-00236833001-28' },
  { id: 'e12', nom: 'MUNGAHI', prenom: 'DJO-JOSEPH', perception: 'CASH', salaireInitial: 500, compteBancaire: '' },
  { id: 'e13', nom: 'NDAYA', prenom: 'SARON', perception: 'VB', salaireInitial: 650, compteBancaire: '25101-01217303001-58' },
  { id: 'e14', nom: 'NSIMBA', prenom: 'YVES', perception: 'VB', salaireInitial: 500, compteBancaire: '00003-01237688001-79' },
  { id: 'e15', nom: 'NTUMBA', prenom: 'RAYANE', perception: 'CASH', salaireInitial: 250, compteBancaire: '' },
  { id: 'e16', nom: 'OKONDO', prenom: 'MARIA', perception: 'VB', salaireInitial: 600, compteBancaire: '44580-800064307-23' },
  { id: 'e17', nom: 'TSHILUMBA', prenom: 'KESTIA', perception: 'VB', salaireInitial: 800, compteBancaire: '' },
  { id: 'e18', nom: 'TSHILUMBA', prenom: 'MICHEL', perception: 'VB', salaireInitial: 500, compteBancaire: '11000-50243100201-85' },
  { id: 'e19', nom: 'YAFALI', prenom: 'ASHLEY', perception: 'VB', salaireInitial: 1000, compteBancaire: '45101-01193584002-10' },
];

// Heures prestées saisies pour Juillet (mois déjà encodé dans le fichier source).
export const seedJuilletHours = {
  e1: { heuresPrestees: 186, bonusHoraire: 0 },
  e2: { heuresPrestees: 186, bonusHoraire: 0 },
  e3: { heuresPrestees: 186, bonusHoraire: 0 },
  e4: { heuresPrestees: 160, bonusHoraire: 0 },
  e5: { heuresPrestees: 175, bonusHoraire: 0 },
  e6: { heuresPrestees: 186, bonusHoraire: 0 },
  e7: { heuresPrestees: 186, bonusHoraire: 0 },
  e8: { heuresPrestees: 186, bonusHoraire: 0 },
  e9: { heuresPrestees: 184.45, bonusHoraire: 0 },
  e10: { heuresPrestees: 186, bonusHoraire: 0 },
  e11: { heuresPrestees: 186, bonusHoraire: 0 },
  e12: { heuresPrestees: 186, bonusHoraire: 0 },
  e13: { heuresPrestees: 173.33, bonusHoraire: 0 },
  e14: { heuresPrestees: 186, bonusHoraire: 0 },
  e15: { heuresPrestees: 186, bonusHoraire: 0 },
  e16: { heuresPrestees: 182, bonusHoraire: 0 },
  e17: { heuresPrestees: 169.74, bonusHoraire: 0 },
  e18: { heuresPrestees: 186, bonusHoraire: 0 },
  e19: { heuresPrestees: 123.21, bonusHoraire: 0 },
};
