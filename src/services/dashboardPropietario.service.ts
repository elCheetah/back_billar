import prisma from "../config/database";

/** Obtener único local del propietario */
async function obtenerUnicoLocalDelUsuario(idUsuario: number) {
  const local = await prisma.local.findFirst({
    where: { id_usuario_admin: idUsuario },
    select: { id_local: true }
  });

  if (!local) {
    const err: any = new Error("No tienes un local.");
    err.code = "NO_LOCAL";
    throw err;
  }

  return local;
}

function hoyLaPaz() {
  const now = new Date();
  return new Date(now.getTime() - 4 * 60 * 60 * 1000);
}

function hoyISO() {
  const d = hoyLaPaz();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function horaLaPazHMS() {
  const d = hoyLaPaz();
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
}

/** RESUMEN HOY */
export async function obtenerResumenDeHoy(idUsuario: number) {
  const { id_local } = await obtenerUnicoLocalDelUsuario(idUsuario);

  const hoy = hoyISO();
  const ahora = horaLaPazHMS();

  // RESERVAS HOY
  const reservas = await prisma.reserva.groupBy({
    by: ["estado_reserva"],
    where: { mesa: { id_local }, fecha_reserva: new Date(hoy) },
    _count: { _all: true }
  });

  const total = reservas.reduce((a, r) => a + r._count._all, 0);
  const s = (e: any) => reservas.find(r => r.estado_reserva === e)?._count._all || 0;
  const pct = (n: number) => total > 0 ? Number(((n * 100) / total).toFixed(2)) : 0;

  // MESAS
  const mesas = await prisma.mesa.findMany({
    where: { id_local },
    select: { id_mesa: true, estado: true }
  });

  const reservasConfirmadas = await prisma.reserva.findMany({
    where: { mesa: { id_local }, fecha_reserva: new Date(hoy), estado_reserva: "CONFIRMADA" },
    select: { id_mesa: true, hora_inicio: true, hora_fin: true }
  });

  const ocupadasPorHorario = new Set<number>();
  for (const r of reservasConfirmadas) {
    const ini = `${r.hora_inicio.getHours().toString().padStart(2,"0")}:${r.hora_inicio.getMinutes().toString().padStart(2,"0")}:00`;
    const fin = `${r.hora_fin.getHours().toString().padStart(2,"0")}:${r.hora_fin.getMinutes().toString().padStart(2,"0")}:00`;
    if (ahora >= ini && ahora < fin) ocupadasPorHorario.add(r.id_mesa);
  }

  let libres = 0, ocupadas = 0, inactivas = 0;
  for (const m of mesas) {
    if (m.estado === "MANTENIMIENTO" || m.estado === "INACTIVO") inactivas++;
    else if (m.estado === "OCUPADO" || ocupadasPorHorario.has(m.id_mesa)) ocupadas++;
    else libres++;
  }

  const totalMesas = mesas.length;
  const pctM = (x: number) => totalMesas > 0 ? Number(((x * 100) / totalMesas).toFixed(2)) : 0;

  return {
    fecha: hoy,
    reservas: {
      total: { cantidad: total, porcentaje: 100 },
      pendientes:   { cantidad: s("PENDIENTE"),   porcentaje: pct(s("PENDIENTE")) },
      confirmadas:  { cantidad: s("CONFIRMADA"),  porcentaje: pct(s("CONFIRMADA")) },
      canceladas:   { cantidad: s("CANCELADA"),   porcentaje: pct(s("CANCELADA")) },
      finalizadas:  { cantidad: s("FINALIZADA"),  porcentaje: pct(s("FINALIZADA")) }
    },
    mesas: {
      total: { cantidad: totalMesas, porcentaje: 100 },
      libres:   { cantidad: libres, porcentaje: pctM(libres) },
      ocupadas: { cantidad: ocupadas, porcentaje: pctM(ocupadas) },
      inactivas:{ cantidad: inactivas, porcentaje: pctM(inactivas) }
    }
  };
}

/** LISTA RESERVAS CONFIRMADAS POR FECHA */
export async function listarConfirmadasPorFecha(idUsuario: number, fecha: string) {
  const { id_local } = await obtenerUnicoLocalDelUsuario(idUsuario);

  const reservas = await prisma.reserva.findMany({
    where: { mesa: { id_local }, fecha_reserva: new Date(fecha), estado_reserva: "CONFIRMADA" },
    select: { hora_inicio: true, hora_fin: true },
    orderBy: { hora_inicio: "asc" }
  });

  return reservas.map(r => {
    const durMin = (r.hora_fin.getHours()*60+r.hora_fin.getMinutes()) - (r.hora_inicio.getHours()*60+r.hora_inicio.getMinutes());
    return {
      horario: `${r.hora_inicio.getHours().toString().padStart(2,"0")}:${r.hora_inicio.getMinutes().toString().padStart(2,"0")} - ${r.hora_fin.getHours().toString().padStart(2,"0")}:${r.hora_fin.getMinutes().toString().padStart(2,"0")}`,
      duracionHoras: Number((durMin / 60).toFixed(2))
    };
  });
}
