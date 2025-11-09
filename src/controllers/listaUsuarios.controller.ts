// src/controllers/listaUsuarios.controller.ts
import { Request, Response } from "express";
import { cambiarEstadoUsuario, listarClientes, listarPropietarios } from "../services/listaUsuarios.service";

export const ListaUsuariosController = {
  async propietarios(_req: Request, res: Response) {
    try {
      const data = await listarPropietarios();
      return res.json({ ok: true, total: data.length, usuarios: data });
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message || "Error al listar propietarios." });
    }
  },

  async clientes(_req: Request, res: Response) {
    try {
      const data = await listarClientes();
      return res.json({ ok: true, total: data.length, usuarios: data });
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message || "Error al listar clientes." });
    }
  },

  async activar(req: Request, res: Response) {
    try {
      const id = (req as any).idUsuario as number;
      const r = await cambiarEstadoUsuario(id, true);
      return res.json({ ok: true, message: "Cuenta activada correctamente.", ...r });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message || "No se pudo activar la cuenta." });
    }
  },

  async suspender(req: Request, res: Response) {
    try {
      const id = (req as any).idUsuario as number;
      const r = await cambiarEstadoUsuario(id, false);
      return res.json({ ok: true, message: "Cuenta suspendida correctamente.", ...r });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message || "No se pudo suspender la cuenta." });
    }
  },
};
