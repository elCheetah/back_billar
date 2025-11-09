// src/templates/estado-email.ts
export function accountStatusEmailHTML(nombre: string, activar: boolean) {
  const asunto = activar ? "Reactivación de cuenta" : "Suspensión de cuenta";
  const titulo = `BilliAR • ${asunto}`;
  const lead = activar
    ? "Tu cuenta ha sido reactivada correctamente."
    : "Tu cuenta ha sido suspendida temporalmente por incumplir nuestras políticas o por actividad inusual.";
  const nota = activar
    ? "Desde ahora puedes volver a iniciar sesión y utilizar todas las funcionalidades."
    : "Si consideras que se trata de un error, por favor contáctanos o revisa los Términos y Condiciones.";
  return `
  <div style="font-family:Inter,Arial,Helvetica,sans-serif; background:#f6f9fc; padding:32px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
           style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="padding:24px 28px 8px 28px; background:#0ea5e9; color:#fff;">
        <h2 style="margin:0;font-weight:700">${titulo}</h2>
      </td></tr>
      <tr><td style="padding:28px">
        <p style="margin:0 0 12px 0; color:#111827">Hola ${nombre || "usuario"},</p>
        <p style="margin:0 0 16px 0; color:#374151">${lead}</p>
        <p style="margin:0 0 8px 0; color:#6b7280">${nota}</p>
        <p style="margin:16px 0 0 0; color:#6b7280">
          Contacto: <a href="mailto:soporte@billiar.app">soporte@billiar.app</a>
          • Términos: <a href="https://billiar.app/terminos">billiar.app/terminos</a>
        </p>
        <p style="margin:16px 0 0 0; color:#9ca3af;font-size:12px">
          © ${new Date().getFullYear()} BilliAR. Todos los derechos reservados.
        </p>
      </td></tr>
    </table>
  </div>`;
}

export function localStatusEmailHTML(nombre: string, nombreLocal: string, activar: boolean) {
  const asunto = activar ? "Reactivación de local" : "Suspensión de local";
  const titulo = `BilliAR • ${asunto}`;
  const lead = activar
    ? `El local “${nombreLocal}” ha sido reactivado.`
    : `El local “${nombreLocal}” ha sido suspendido temporalmente.`;
  const nota = activar
    ? "Tus clientes ya pueden volver a visualizar y reservar mesas."
    : "Durante la suspensión, el local no aparecerá en la búsqueda ni permitirá reservas.";
  return `
  <div style="font-family:Inter,Arial,Helvetica,sans-serif; background:#f6f9fc; padding:32px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
           style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="padding:24px 28px 8px 28px; background:#0ea5e9; color:#fff;">
        <h2 style="margin:0;font-weight:700">${titulo}</h2>
      </td></tr>
      <tr><td style="padding:28px">
        <p style="margin:0 0 12px 0; color:#111827">Hola ${nombre || "usuario"},</p>
        <p style="margin:0 0 16px 0; color:#374151">${lead}</p>
        <p style="margin:0 0 8px 0; color:#6b7280">${nota}</p>
        <p style="margin:16px 0 0 0; color:#6b7280">
          Contacto: <a href="mailto:soporte@billiar.app">soporte@billiar.app</a>
          • Términos: <a href="https://billiar.app/terminos">billiar.app/terminos</a>
        </p>
        <p style="margin:16px 0 0 0; color:#9ca3af;font-size:12px">
          © ${new Date().getFullYear()} BilliAR. Todos los derechos reservados.
        </p>
      </td></tr>
    </table>
  </div>`;
}
