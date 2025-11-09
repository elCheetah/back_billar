//templates/reset-email.ts
export function resetEmailHTML(nombre: string, codigo: string, min: number) {
  // Mostrar como NNN-LLL para legibilidad (aceptamos sin guión en backend)
  const pretty = `${codigo.slice(0, 3)}-${codigo.slice(3)}`;
  return `
  <div style="font-family:Inter,Arial,Helvetica,sans-serif; background:#f6f9fc; padding:32px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
           style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr>
        <td style="padding:24px 28px 8px 28px; background:#0ea5e9; color:#fff;">
          <h2 style="margin:0;font-weight:700">BilliAR • Restablecer contraseña</h2>
        </td>
      </tr>
      <tr>
        <td style="padding:28px">
          <p style="margin:0 0 12px 0; color:#111827">Hola ${nombre || 'usuario'},</p>
          <p style="margin:0 0 16px 0; color:#374151">
            Usa este código para verificar tu identidad y continuar con el cambio de contraseña.
          </p>

          <div style="text-align:center;margin:24px 0">
            <div style="display:inline-block;padding:14px 22px;border:2px solid #0ea5e9;border-radius:10px;
                        font-size:24px;letter-spacing:2px;color:#0ea5e9;font-weight:800;">
              ${pretty}
            </div>
          </div>

          <p style="margin:0 0 8px 0; color:#6b7280">
            El código es válido durante <strong>${min} minutos</strong>.
          </p>
          <p style="margin:0 0 8px 0; color:#6b7280">
            Si no solicitaste este cambio, ignora este mensaje.
          </p>
          <p style="margin:16px 0 0 0; color:#9ca3af;font-size:12px">
            © ${new Date().getFullYear()} BilliAR. Todos los derechos reservados.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}
