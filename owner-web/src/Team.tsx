import { pickImage } from './files';
import { useOwner } from './store';

export function Team() {
  const { team, updateProfessional, addProfessional, removeProfessional } = useOwner();

  return (
    <section>
      <h1>Equipo de esta sucursal</h1>
      <button type="button" className="primary" onClick={addProfessional}>
        Sumar al equipo
      </button>
      {team.length === 0 ? (
        <p className="muted">Todavía no hay profesionales en este local.</p>
      ) : (
        <ul className="list">
          {team.map((pro) => (
            <li key={pro.id} className="card editor staff-edit">
              <button
                type="button"
                className="thumb-btn tall"
                onClick={() => pickImage((uri) => updateProfessional(pro.id, { photo: uri }))}
              >
                {pro.photo ? <img src={pro.photo} alt={pro.name} /> : <span className="ph">Foto</span>}
                <span>Cambiar foto</span>
              </button>
              <div className="fields">
                <label>
                  Nombre
                  <input
                    value={pro.name}
                    onChange={(e) => updateProfessional(pro.id, { name: e.target.value })}
                  />
                </label>
                <label>
                  Rol
                  <input
                    value={pro.role}
                    onChange={(e) => updateProfessional(pro.id, { role: e.target.value })}
                  />
                </label>
                <label>
                  Matrícula
                  <input
                    value={pro.license}
                    onChange={(e) => updateProfessional(pro.id, { license: e.target.value })}
                  />
                </label>
                <label>
                  Años
                  <input
                    inputMode="numeric"
                    value={String(pro.years)}
                    onChange={(e) =>
                      updateProfessional(pro.id, {
                        years: Number(e.target.value.replace(/\D/g, '')) || 0,
                      })
                    }
                  />
                </label>
                <label className="span-2">
                  Descripción
                  <textarea
                    rows={3}
                    value={pro.bio}
                    onChange={(e) => updateProfessional(pro.id, { bio: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="danger span-2"
                  onClick={() => removeProfessional(pro.id)}
                >
                  Eliminar integrante
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
