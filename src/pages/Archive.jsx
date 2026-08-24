/**
 * Suivi mensuel : instantanés archivés, filtrables par mois.
 */
import { useMemo, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useData } from '../context/DataContext.jsx';
import { MOIS, formatCurrency, formatHours } from '../utils/payroll';
import { PerceptionBadge, DeltaBadge } from '../components/Badges.jsx';

export default function Archive() {
  const { archive, archivedMonths, deleteArchiveMonth } = useData();
  const [filter, setFilter] = useState('all');
  const [toDelete, setToDelete] = useState(null);

  const groups = useMemo(() => {
    const byMonth = {};
    archive.forEach((row) => {
      if (!byMonth[row.mois]) byMonth[row.mois] = [];
      byMonth[row.mois].push(row);
    });
    // Conserve l'ordre calendaire (janvier → décembre), pas l'ordre d'archivage.
    const orderedMonths = MOIS.filter((m) => byMonth[m]);
    return orderedMonths
      .filter((m) => filter === 'all' || filter === m)
      .map((m) => ({
        mois: m,
        rows: byMonth[m],
        total: byMonth[m].reduce((s, r) => s + (r.salairePlusBonus || 0), 0),
        archivedAt: byMonth[m][0]?.archivedAt,
      }));
  }, [archive, filter]);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Filtrer :</span>
          <select className="form-select w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tous les mois archivés</option>
            {archivedMonths.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <span className="text-muted small">{archivedMonths.length} mois archivé(s) sur 12</span>
      </div>

      {groups.length === 0 && (
        <div className="sp-card p-5 text-center text-muted">
          <i className="bi bi-archive fs-1 d-block mb-2" />
          Aucun mois archivé pour le moment. Rendez-vous sur la Fiche salariale pour archiver un mois.
        </div>
      )}

      {groups.map((g) => (
        <div className="sp-card p-3" key={g.mois}>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h6 className="fw-bold mb-0">{g.mois}</h6>
              <span className="text-muted small">
                Archivé le {g.archivedAt ? new Date(g.archivedAt).toLocaleDateString('fr-FR') : '—'} · Masse salariale : <strong>{formatCurrency(g.total)}</strong>
              </span>
            </div>
            <button className="btn btn-sm btn-outline-danger" onClick={() => setToDelete(g.mois)}>
              <i className="bi bi-trash me-1" /> Supprimer l'archive
            </button>
          </div>
          <div className="table-responsive">
            <table className="table sp-table mb-0">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Perception</th>
                  <th>Heures prestées</th>
                  <th>Delta</th>
                  <th>Salaire</th>
                  <th>Bonus</th>
                  <th>Retenue</th>
                  <th>Salaire + bonus</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-semibold">{r.nom}</td>
                    <td>{r.prenom}</td>
                    <td><PerceptionBadge value={r.perception} /></td>
                    <td>{r.heuresPrestees ? formatHours(r.heuresPrestees) : '—'}</td>
                    <td><DeltaBadge delta={r.delta} /></td>
                    <td>{r.salaire ? formatCurrency(r.salaire) : '—'}</td>
                    <td>{r.montantBonus ? formatCurrency(r.montantBonus) : '—'}</td>
                    <td>{r.retenue ? <span className="text-danger">{formatCurrency(r.retenue)}</span> : '—'}</td>
                    <td className="fw-bold">{r.salairePlusBonus ? formatCurrency(r.salairePlusBonus) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Modal show={!!toDelete} onHide={() => setToDelete(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">Supprimer l'archive de {toDelete}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Cette action supprime définitivement l'instantané archivé de <strong>{toDelete}</strong> du Suivi mensuel. Les données d'heures prestées encodées ne sont pas affectées.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setToDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={() => { deleteArchiveMonth(toDelete); setToDelete(null); }}>Supprimer</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
