import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';

const AMIGOS = ["Videla", "Padre", "Juampi", "Fabri", "Choza", "Peke", "Negro", "Ivan", "Mauro"];

// Configuramos la música de fondo (se carga desde la carpeta public)
const musicaFondo = new Audio('/palgeto.m4a');
musicaFondo.loop = true;
musicaFondo.volume = 0.3; // Volumen suave (30%)

export default function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);

  const manejarIngreso = (nombre) => {
    if (nombre === "Videla") {
      const pass = prompt("Ingrese contraseña de Admin:");
      if (pass === "mate2027") { 
        setUsuarioActual({ nombre: nombre, admin: true });
        musicaFondo.play().catch(err => console.log("Autoplay bloqueado:", err));
      } else {
        alert("Contraseña incorrecta.");
      }
    } else {
      setUsuarioActual({ nombre: nombre, admin: false });
      musicaFondo.play().catch(err => console.log("Autoplay bloqueado:", err));
    }
  };

  if (!usuarioActual) {
    return (
      <div className="login-container">
        <h1 className="title">MDQ 2027</h1>
        <h2 className="subtitle">¿Quién va a pagar?</h2>
        <div className="grid-amigos">
          {AMIGOS.map((amigo) => (
            <button key={amigo} onClick={() => manejarIngreso(amigo)} className="btn-amigo">
              {amigo}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Dashboard 
      usuario={usuarioActual} 
      salir={() => {
        setUsuarioActual(null);
        musicaFondo.pause();          // Pausamos la música al salir
        musicaFondo.currentTime = 0;  // La reiniciamos al segundo 0
      }} 
    />
  );
}

function Dashboard({ usuario, salir }) {
  const [pozo, setPozo] = useState(0);
  const [cuota, setCuota] = useState(0);
  const [deudas, setDeudas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const inicializarBaseDeDatos = async () => {
    const batch = writeBatch(db);
    const configRef = doc(db, "config", "global");
    
    batch.set(configRef, {
      pozo_total: 724540,
      cuota_actual: 7000
    });

    const estadoInicial = [
      { nombre: "Padre", deuda: 14000 },
      { nombre: "Choza", deuda: 0 },
      { nombre: "Peke", deuda: 0 },
      { nombre: "Videla", deuda: 21000 },
      { nombre: "Fabri", deuda: 21000 },
      { nombre: "Negro", deuda: 39000 },
      { nombre: "Juampi", deuda: 14000 },
      { nombre: "Ivan", deuda: 34000 },
      { nombre: "Mauro", deuda: 52000 }
    ];

    estadoInicial.forEach((amigo) => {
      const ref = doc(db, "users", amigo.nombre);
      batch.set(ref, { nombre: amigo.nombre, deuda_actual: amigo.deuda });
    });

    await batch.commit();
    alert("¡Base de datos inicializada!");
    obtenerDatos(); 
  };

  const obtenerDatos = async () => {
    setCargando(true);
    try {
      const docGlobal = await getDoc(doc(db, "config", "global"));
      if (docGlobal.exists()) {
        setPozo(docGlobal.data().pozo_total);
        setCuota(docGlobal.data().cuota_actual);
      }

      const usuariosSnapshot = await getDocs(collection(db, "users"));
      const listaUsuarios = usuariosSnapshot.docs.map(doc => doc.data());
      
      listaUsuarios.sort((a, b) => b.deuda_actual - a.deuda_actual);
      setDeudas(listaUsuarios);
    } catch (error) {
      console.error("Error al obtener datos:", error);
    } finally {
      setCargando(false);
    }
  };

  const registrarPago = async () => {
    const montoString = prompt(`¿Cuánta plata transferiste, ${usuario.nombre}? (Solo números)`);
    const monto = parseInt(montoString);

    if (!monto || isNaN(monto) || monto <= 0) {
      alert("Monto inválido.");
      return;
    }

    try {
      setCargando(true);
      const usuarioActivo = deudas.find(d => d.nombre === usuario.nombre);
      const nuevaDeuda = usuarioActivo.deuda_actual - monto;

      const userRef = doc(db, "users", usuario.nombre);
      await updateDoc(userRef, { deuda_actual: nuevaDeuda });

      const nuevoPozo = pozo + monto;
      const configRef = doc(db, "config", "global");
      await updateDoc(configRef, { pozo_total: nuevoPozo });

      alert(`¡Pago de $${monto} registrado con éxito!`);
      obtenerDatos(); 
    } catch (error) {
      console.error("Error al registrar pago:", error);
      alert("Hubo un error al guardar el pago.");
    }
  };

  const aplicarCuotaSemanal = async () => {
    const confirmar = window.confirm(`¿Estás seguro que querés sumarle $${cuota} de deuda a todos los pibes?`);
    if (!confirmar) return;

    try {
      setCargando(true);
      const batch = writeBatch(db);

      deudas.forEach((amigo) => {
        const nuevaDeuda = amigo.deuda_actual + cuota;
        const ref = doc(db, "users", amigo.nombre);
        batch.update(ref, { deuda_actual: nuevaDeuda });
      });

      await batch.commit();
      alert("¡Deuda semanal aplicada a todos!");
      obtenerDatos();
    } catch (error) {
      console.error("Error al aplicar cuota:", error);
    }
  };

  const cambiarCuota = async () => {
    const nuevaCuotaString = prompt(`¿De cuánto va a ser la nueva cuota semanal? (Actualmente es $${cuota})`);
    const nuevaCuota = parseInt(nuevaCuotaString);

    if (!nuevaCuota || isNaN(nuevaCuota) || nuevaCuota <= 0) {
      alert("Monto inválido. Operación cancelada.");
      return;
    }

    try {
      setCargando(true);
      const configRef = doc(db, "config", "global");
      await updateDoc(configRef, { cuota_actual: nuevaCuota });
      setCuota(nuevaCuota);
      alert(`¡Cuota actualizada a $${nuevaCuota.toLocaleString('es-AR')}!`);
    } catch (error) {
      console.error("Error al cambiar la cuota:", error);
      alert("Hubo un error al guardar la nueva cuota.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerDatos();
  }, []);

  return (
    <div className="dashboard-container">
      <header className="header-nav">
        <h2>Hola, {usuario.nombre} {usuario.admin ? "👑" : ""}</h2>
        <button className="btn-salir" onClick={salir}>Salir</button>
      </header>
      
      {cargando ? (
        <div className="loader">Cargando datos...</div>
      ) : (
        <main className="main-content">
          <section className="card-pozo">
            <h3 className="pozo-label">Pozo Total</h3>
            <h1 className="pozo-monto">${pozo.toLocaleString('es-AR')}</h1>
            
            <button className="btn-pago" onClick={registrarPago}>
              💸 Informar Pago
            </button>

            {usuario.admin && pozo === 0 && (
              <button className="btn-admin-init" onClick={inicializarBaseDeDatos}>
                ⚠️ Inicializar Base de Datos
              </button>
            )}

            {usuario.admin && pozo > 0 && (
              <div className="admin-actions">
                <button className="btn-admin-edit" onClick={cambiarCuota}>
                  ⚙️ Cambiar cuota (Actual: ${cuota})
                </button>
                <button className="btn-admin-cuota" onClick={aplicarCuotaSemanal}>
                  🔴 Sumar deuda semanal (${cuota})
                </button>
              </div>
            )}
          </section>

          <section className="card-deudas">
            <h3>Control de Pagos</h3>
            <div className="table-responsive">
              <table className="tabla-pagos">
                <thead>
                  <tr>
                    <th>Amigo</th>
                    <th className="align-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {deudas.map((d) => (
                    <tr key={d.nombre}>
                      <td className="amigo-nombre">{d.nombre}</td>
                      <td className="align-right">
                        <span className={`badge ${d.deuda_actual > 0 ? 'estado-debe' : d.deuda_actual < 0 ? 'estado-favor' : 'estado-aldia'}`}>
                          {d.deuda_actual > 0 ? `Debe $${d.deuda_actual.toLocaleString('es-AR')}` : 
                           d.deuda_actual < 0 ? `A favor $${Math.abs(d.deuda_actual).toLocaleString('es-AR')}` : 'Al día'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}