/* eslint-disable no-console */
// poblador.js
require("dotenv").config();

let PrismaClient, Prisma;
try {
  ({ PrismaClient, Prisma } = require("@prisma/client"));
} catch {
  console.log("› Prisma Client no encontrado. Generando con `npx prisma generate` …");
  require("child_process").execSync("npx prisma generate", { stdio: "inherit" });
  ({ PrismaClient, Prisma } = require("@prisma/client"));
}

const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");


/** ====== Config imágenes (mismas para todos) ====== */
const IMG = {
  LOCAL:
    "https://res.cloudinary.com/dbdtskhuk/image/upload/v1761091247/billar/mesas/esudnjify8sdesalymiu.jpg",
  MESA:
    "https://res.cloudinary.com/dbdtskhuk/image/upload/v1761091247/billar/locales/afk9rcpcobdzoyluuzi0.jpg",
  COMPROBANTE:
    "https://res.cloudinary.com/dbdtskhuk/image/upload/v1761367831/comprobante_wwtp56.avif",
};

const PASS_PLANO = "*Password123";
const TIPOS = ["POOL", "CARAMBOLA", "SNOOKER", "MIXTO"];
const PRECIOS = { POOL: 25, CARAMBOLA: 30, SNOOKER: 35, MIXTO: 28 };

const toDec = (v) => new Prisma.Decimal(v);

/** =================== Ubicaciones =================== */
const CLUSTERS = [
  { nombre: "Cercado",  ciudad: "Cochabamba", lat: -17.3895, lon: -66.1568, count: 16 },
  { nombre: "UMSS",     ciudad: "Cochabamba", lat: -17.3936, lon: -66.1453, count: 12 },
  { nombre: "Terminal", ciudad: "Cochabamba", lat: -17.4009, lon: -66.1581, count: 8 },
  { nombre: "Sacaba",   ciudad: "Sacaba",     lat: -17.4041, lon: -66.0359, count: 4 },
];

// offsets regulares (múltiplos de 0.015°) ≈ 1.6 km
const STEP = 0.015;
const OFFSETS = [
  [ 0,  0],
  [ 1,  0], [-1, 0], [0,  1], [ 0, -1],
  [ 1,  1], [ 1, -1], [-1, 1], [-1, -1],
  [ 2,  0], [-2, 0], [0,  2], [ 0, -2],
  [ 2,  1], [ 2, -1], [-2, 1], [-2, -1],
  [ 1,  2], [ 1, -2], [-1, 2], [-1, -2],
  [ 2,  2], [ 2, -2], [-2, 2], [-2, -2],
];

/** Direcciones realistas */
const CALLES = [
  "Av. Ayacucho", "Av. Heroínas", "Av. Aroma", "C. España", "Av. América",
  "Av. Oquendo", "C. Sucre", "Av. Blanco Galindo", "Av. Circunvalación",
  "Av. Simón López", "Av. Pando", "C. Jordán", "Av. Tadeo Haenke",
];

/** Base de nombres; garantizamos unicidad en DB */
const NOMBRES_BASE = [
  "Billares Central", "Snooker Elite", "Carambola Pro", "Pool & Fun",
  "La Tronera", "Golden Cue", "Master Break", "Royal Pool",
  "El Rincón del Billar", "Club Snooker", "Break Point", "Blue Diamond",
];

function direccionAleatoria() {
  const c = CALLES[Math.floor(Math.random() * CALLES.length)];
  const num = 100 + Math.floor(Math.random() * 1700);
  return `${c} ${num}`;
}

function coordsFrom(cluster, k) {
  const [dx, dy] = OFFSETS[k % OFFSETS.length];
  const lat = cluster.lat + dy * STEP;
  const lon = cluster.lon + dx * STEP;
  return { lat, lon };
}

async function nombreLocalUnico(base) {
  let intento = base;
  let n = 1;
  while (true) {
    const exists = await prisma.local.findFirst({ where: { nombre: intento } });
    if (!exists) return intento;
    n += 1;
    intento = `${base} ${n}`;
  }
}

function nombreLocalBase(i, clusterNombre) {
  const base = NOMBRES_BASE[i % NOMBRES_BASE.length];
  const lote = Math.floor(i / NOMBRES_BASE.length) + 1;
  const etiqueta = lote > 1 ? `${base} ${lote}` : base;
  return `${etiqueta} - ${clusterNombre}`;
}

/** ========= Helpers de fechas/horas ========= */
const today = new Date();
function daysAgo(n) {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}
function daysFromNow(n) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}
// @db.Time → 1970-01-01 UTC
function timeUTC(h, m) {
  return new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
}

/** ========= Políticas de tipos de mesa por local ========= */
const ALL_MIXTO_INDICES = new Set([3, 11, 19, 27, 35]);
const ALL_POOL_INDICES  = new Set([6, 14, 22, 30, 38]);
function policyForLocal(globalIndex) {
  if (ALL_MIXTO_INDICES.has(globalIndex)) return "ALL_MIXTO";
  if (ALL_POOL_INDICES.has(globalIndex))  return "ALL_POOL";
  return "ALTERNATE";
}
function precioPorTipo(tipo) {
  return toDec(PRECIOS[tipo].toFixed(2));
}

/** ========= Horarios por local (si no existen) ========= */
async function asegurarHorarios(id_local) {
  const count = await prisma.horarioLocal.count({ where: { id_local } });
  if (count > 0) return;

  const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];
  const data = DIAS.map((d) => {
    const apertura = timeUTC(10, 0);
    const cierre   = d === "DOMINGO" ? timeUTC(20, 0) : timeUTC(22, 0);
    return {
      id_local,
      dia_semana: d,
      hora_apertura: apertura,
      hora_cierre: cierre,
      estado: "ACTIVO",
    };
  });
  await prisma.horarioLocal.createMany({ data });
}

/** ========= Asegurar 4 mesas por local + imagen por mesa ========= */
async function asegurarMesas(id_local, policy, enforce) {
  let existentes = await prisma.mesa.findMany({
    where: { id_local },
    orderBy: { numero_mesa: "asc" },
  });

  for (let numero_mesa = existentes.length + 1; numero_mesa <= 4; numero_mesa++) {
    const tipo_mesa =
      policy === "ALL_MIXTO" ? "MIXTO" :
      policy === "ALL_POOL"  ? "POOL"  :
      TIPOS[(numero_mesa - 1) % TIPOS.length];

    const nueva = await prisma.mesa.create({
      data: {
        id_local,
        numero_mesa,
        tipo_mesa,
        precio_hora: precioPorTipo(tipo_mesa),
        estado: "DISPONIBLE",
      },
    });
    existentes.push(nueva);
  }
  existentes = existentes.slice(0, 4);

  if (enforce) {
    for (let i = 0; i < existentes.length; i++) {
      const m = existentes[i];
      const tipoDeseado =
        policy === "ALL_MIXTO" ? "MIXTO" :
        policy === "ALL_POOL"  ? "POOL"  :
        TIPOS[i % TIPOS.length];

      if (m.tipo_mesa !== tipoDeseado || Number(m.precio_hora) !== PRECIOS[tipoDeseado]) {
        await prisma.mesa.update({
          where: { id_mesa: m.id_mesa },
          data: {
            tipo_mesa: tipoDeseado,
            precio_hora: precioPorTipo(tipoDeseado),
          },
        });
      }
    }
  }

  for (const m of existentes) {
    const yaImg = await prisma.imagen.findFirst({ where: { mesaId: m.id_mesa } });
    if (!yaImg) {
      await prisma.imagen.create({
        data: { mesaId: m.id_mesa, url_imagen: IMG.MESA, base64: null },
      });
    }
  }
  return existentes;
}

/** ========= Asegurar 1 local por propietario + imagen + mesas + horarios ========= */
async function asegurarLocalParaPropietario(usuario, globalIndex) {
  let local = await prisma.local.findFirst({
    where: { id_usuario_admin: usuario.id_usuario },
  });
  let created = false;

  if (!local) {
    let slot = globalIndex; // 0..39
    let clusterIdx = 0;
    let base = 0;
    for (let c = 0; c < CLUSTERS.length; c++) {
      const cap = CLUSTERS[c].count;
      if (slot < base + cap) {
        clusterIdx = c;
        slot = slot - base;
        break;
      }
      base += cap;
    }
    const cluster = CLUSTERS[clusterIdx];
    const { lat, lon } = coordsFrom(cluster, slot);

    const nombreBase = nombreLocalBase(globalIndex, cluster.nombre);
    const nombre = await nombreLocalUnico(nombreBase);

    const dir = `${direccionAleatoria()} (Zona ${cluster.nombre})`;

    local = await prisma.local.create({
      data: {
        id_usuario_admin: usuario.id_usuario,
        nombre,
        direccion: dir,
        ciudad: cluster.ciudad,
        latitud: toDec(lat.toFixed(6)),
        longitud: toDec(lon.toFixed(6)),
        descuento_global: toDec("0"),
        estado: "ACTIVO",
        qr_pago_url: null,
      },
    });
    created = true;
  }

  const imgLocal = await prisma.imagen.findFirst({ where: { localId: local.id_local } });
  if (!imgLocal) {
    await prisma.imagen.create({
      data: { localId: local.id_local, url_imagen: IMG.LOCAL, base64: null },
    });
  }

  const policy = policyForLocal(globalIndex);
  const mesas = await asegurarMesas(local.id_local, policy, created);

  // ⇩ NUEVO: asegurar horarios (si no existen)
  await asegurarHorarios(local.id_local);

  return { local, mesas, created };
}

/** ========= Crear 4 reservas históricas por cliente ========= */
async function crearHistorialParaCliente(user, localesDisponibles) {
  const locales = [...localesDisponibles].sort(() => Math.random() - 0.5).slice(0, 4);

  const escenarios = [
    { estado: "FINALIZADA", pago: "QR" },        // APROBADO + comprobante_url
    { estado: "FINALIZADA", pago: "EFECTIVO" },  // APROBADO sin comprobante_url
    { estado: "CANCELADA",  pago: null },        // sin pago
    { estado: "CANCELADA",  pago: null, penal: true }, // con penalización
  ];

  let dlist = [15, 30, 60, 90].map((n) => daysAgo(10 + Math.floor(Math.random() * n)));
  dlist = dlist.slice(0, 4);

  const creaciones = [];
  for (let i = 0; i < locales.length; i++) {
    const { local, mesas } = locales[i];
    const mesa = mesas[i % mesas.length];
    const fecha_reserva = dlist[i];

    const turnos = [
      [10, 12],
      [14, 16],
      [18, 20],
      [20, 22],
    ];
    const [H1, H2] = turnos[i % turnos.length];
    const hora_inicio = timeUTC(H1, 0);
    const hora_fin = timeUTC(H2, 0);

    const horas = H2 - H1;
    const precioHora = Number(mesa.precio_hora);
    const monto_estimado = toDec((horas * precioHora).toFixed(2));

    const esc = escenarios[i];

    creaciones.push(
      prisma.reserva.create({
        data: {
          id_usuario: user.id_usuario,
          id_mesa: mesa.id_mesa,
          fecha_reserva,
          hora_inicio,
          hora_fin,
          monto_estimado,
          estado_reserva: esc.estado,
          penalizacion_aplicada: esc.penal ? toDec("15.00") : toDec("0"),
        },
      })
    );
  }

  const reservas = await Promise.all(creaciones);

  for (let i = 0; i < reservas.length; i++) {
    const r = reservas[i];
    const esc = escenarios[i];

    if (esc.estado === "FINALIZADA") {
      const monto = r.monto_estimado ?? toDec("0");
      await prisma.pago.create({
        data: {
          id_reserva: r.id_reserva,
          id_usuario: user.id_usuario,
          monto,
          comprobante_url: esc.pago === "QR" ? IMG.COMPROBANTE : null,
          estado_pago: "APROBADO",
          fecha_confirmacion: new Date(),
        },
      });
    } else if (esc.penal) {
      await prisma.penalizacion.create({
        data: {
          id_usuario: user.id_usuario,
          id_reserva: r.id_reserva,
          porcentaje: toDec("15.00"),
          estado: "ACTIVA",
          bloqueo_hasta: null,
        },
      });
    }
  }
}

/** ========= NUEVO: 3 reservas PENDIENTES por cliente ========= */
async function crearPendientesParaCliente(user, localesDisponibles) {
  const locales = [...localesDisponibles].sort(() => Math.random() - 0.5).slice(0, 3);
  const fechas = [3, 10, 17].map(daysFromNow);

  const franjas = [
    [12, 14],
    [16, 18],
    [19, 21],
  ];

  for (let i = 0; i < locales.length; i++) {
    const { mesas } = locales[i];
    const mesa = mesas[(i + 1) % mesas.length];

    const [H1, H2] = franjas[i % franjas.length];
    const hora_inicio = timeUTC(H1, 0);
    const hora_fin = timeUTC(H2, 0);
    const horas = H2 - H1;

    const precioHora = Number(mesa.precio_hora);
    const monto_estimado = toDec((horas * precioHora).toFixed(2));

    await prisma.reserva.create({
      data: {
        id_usuario: user.id_usuario,
        id_mesa: mesa.id_mesa,
        fecha_reserva: fechas[i],
        hora_inicio,
        hora_fin,
        monto_estimado,
        estado_reserva: "PENDIENTE",
        penalizacion_aplicada: toDec("0"),
      },
    });
  }
}

/** ========= MAIN ========= */
async function main() {
  console.log("== Poblador: 40 propietarios + locales/mesas + horarios + 3 clientes con historial y pendientes ==");

  const hash = await bcrypt.hash(PASS_PLANO, 10);

  /** 1) Crear 40 propietarios (idempotente) */
  const propietarios = [];
  const nombres = ["Carlos", "María", "Jorge", "Lucía", "Roberto", "Paola", "Gonzalo", "Natalia"];
  const ap1 = ["Rojas", "Salazar", "Mendoza", "Gutiérrez", "Fernández", "Quispe", "Vargas", "Torrez"];
  const ap2 = ["Pérez", "Torres", "Flores", "Ramírez", "Aguilar", "Camacho", "Mamani", "López"];

  for (let i = 1; i <= 40; i++) {
    const correo = `propietario${i}@gmail.com`;
    const u = await prisma.usuario.upsert({
      where: { correo },
      update: {},
      create: {
        nombre: nombres[i % nombres.length],
        primer_apellido: ap1[i % ap1.length],
        segundo_apellido: ap2[i % ap2.length],
        correo,
        password: hash,
        celular: `7${(1000000 + i).toString().slice(0, 7)}`,
        rol: "PROPIETARIO",
        estado: "ACTIVO",
      },
    });
    propietarios.push(u);
  }
  console.log(`› Propietarios: ${propietarios.length}`);

  /** 2) Un local por propietario + imagen + 4 mesas + horarios (si faltan) */
  const localesMesaPack = [];
  for (let i = 0; i < propietarios.length; i++) {
    const pack = await asegurarLocalParaPropietario(propietarios[i], i);
    localesMesaPack.push({ local: pack.local, mesas: pack.mesas });
  }
  console.log(`› Locales asegurados: ${localesMesaPack.length} (con 4 mesas, imágenes y horarios)`);

  /** 3) Crear 3 clientes (idempotente) */
  const clientes = [];
  for (let i = 1; i <= 3; i++) {
    const correo = `cliente${i}@gmail.com`;
    const u = await prisma.usuario.upsert({
      where: { correo },
      update: {},
      create: {
        nombre: ["Abel", "Daniela", "Hernán"][i - 1],
        primer_apellido: ["Soria", "Mercado", "Ríos"][i - 1],
        segundo_apellido: ["López", "Guzmán", "Flores"][i - 1],
        correo,
        password: hash,
        celular: `6${(8000000 + i).toString().slice(0, 7)}`,
        rol: "CLIENTE",
        estado: "ACTIVO",
      },
    });
    clientes.push(u);
  }
  console.log(`› Clientes: ${clientes.length}`);

  /** 4) Historial (4) + Pendientes (3) por cliente */
  for (const c of clientes) {
    await crearHistorialParaCliente(c, localesMesaPack);
    await crearPendientesParaCliente(c, localesMesaPack);
  }
  console.log("› Reservas: 4 históricas + 3 pendientes por cliente (pagos/penalizaciones incluidos) ");

  console.log("== OK ==");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("ERROR en poblador:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
