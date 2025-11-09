// src/services/dashboardAdmin.service.ts
import prisma from "../config/database";

type BloqueUsuarios = {
  total: number;
  activos: number;
  inactivos: number;
  porcentaje_activos: number;
  porcentaje_inactivos: number;
};

type BloqueUsuariosPorRol = {
  total: number;
  activos: number;
  inactivos: number;
  porcentaje_activos: number;
  porcentaje_inactivos: number;
};

type ResumenDashboard = {
  usuarios: BloqueUsuarios & {
    clientes: BloqueUsuariosPorRol;
    propietarios: BloqueUsuariosPorRol;
  };
  locales: {
    total: number;
    activos: number;
    inactivos: number;
    porcentaje_activos: number;
    porcentaje_inactivos: number;
  };
};

function pct(p: number, t: number) {
  if (!t) return 0;
  return Math.round((p * 10000) / t) / 100;
}

export async function obtenerEstadisticasDashboard(): Promise<ResumenDashboard> {
  const [
    usuariosTotal,
    usuariosActivos,
    usuariosInactivos,
    clientesTotal,
    clientesActivos,
    clientesInactivos,
    propsTotal,
    propsActivos,
    propsInactivos,
    localesTotal,
    localesActivos,
    localesInactivos,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.usuario.count({ where: { estado: "ACTIVO" } }),
    prisma.usuario.count({ where: { estado: "INACTIVO" } }),
    prisma.usuario.count({ where: { rol: "CLIENTE" } }),
    prisma.usuario.count({ where: { rol: "CLIENTE", estado: "ACTIVO" } }),
    prisma.usuario.count({ where: { rol: "CLIENTE", estado: "INACTIVO" } }),
    prisma.usuario.count({ where: { rol: "PROPIETARIO" } }),
    prisma.usuario.count({ where: { rol: "PROPIETARIO", estado: "ACTIVO" } }),
    prisma.usuario.count({ where: { rol: "PROPIETARIO", estado: "INACTIVO" } }),
    prisma.local.count(),
    prisma.local.count({ where: { estado: "ACTIVO" } }),
    prisma.local.count({ where: { estado: "INACTIVO" } }),
  ]);

  const usuarios: ResumenDashboard["usuarios"] = {
    total: usuariosTotal,
    activos: usuariosActivos,
    inactivos: usuariosInactivos,
    porcentaje_activos: pct(usuariosActivos, usuariosTotal),
    porcentaje_inactivos: pct(usuariosInactivos, usuariosTotal),
    clientes: {
      total: clientesTotal,
      activos: clientesActivos,
      inactivos: clientesInactivos,
      porcentaje_activos: pct(clientesActivos, clientesTotal),
      porcentaje_inactivos: pct(clientesInactivos, clientesTotal),
    },
    propietarios: {
      total: propsTotal,
      activos: propsActivos,
      inactivos: propsInactivos,
      porcentaje_activos: pct(propsActivos, propsTotal),
      porcentaje_inactivos: pct(propsInactivos, propsTotal),
    },
  };

  const locales: ResumenDashboard["locales"] = {
    total: localesTotal,
    activos: localesActivos,
    inactivos: localesInactivos,
    porcentaje_activos: pct(localesActivos, localesTotal),
    porcentaje_inactivos: pct(localesInactivos, localesTotal),
  };

  return { usuarios, locales };
}
