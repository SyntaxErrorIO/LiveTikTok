/**
 * Módulo centralizado de valores de relleno prohibidos para variables de seguridad.
 * En producción, ninguna credencial ni secreto criptográfico puede coincidir con
 * las plantillas por defecto de documentación ni ejemplos (.env.example).
 */

export const FORBIDDEN_PLACEHOLDER_SECRETS: readonly string[] = [
  'cambia_esta_clave_secreta_por_una_aleatoria_muy_segura_en_produccion',
  'tu_contrasena_administrador_fuerte_aqui_minimo_10_caracteres',
  'tu_clave_euler_stream_aqui',
  'tu_secreto_webhook_tiktok_opcional',
  'livetrigger_sec_prod_key',
  'secret',
  'password',
  'admin',
  'changeme',
];

/**
 * Determina si una clave o secreto contiene o coincide con un valor de ejemplo/relleno.
 */
export function isForbiddenPlaceholder(value?: string | null): boolean {
  if (!value) return false;
  const val = value.trim().toLowerCase();
  if (val.length === 0) return false;

  // Coincidencia exacta con la lista negra
  if (FORBIDDEN_PLACEHOLDER_SECRETS.some((forbidden) => val === forbidden.toLowerCase())) {
    return true;
  }

  // Patrones típicos de placeholder en documentación
  if (
    val.startsWith('tu_') ||
    val.includes('aqui') ||
    val.includes('cambia_esta_clave') ||
    val.includes('tu_contrasena') ||
    val.includes('tu_clave')
  ) {
    return true;
  }

  return false;
}

/**
 * Valida los secretos críticos en entornos de producción.
 * Si JWT_SECRET o ADMIN_PASSWORD coinciden con valores de relleno,
 * lanza un error en español y detiene el arranque del servidor.
 */
export function validateProductionSecrets(): void {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret.length < 32 || isForbiddenPlaceholder(jwtSecret)) {
    const errorMsg =
      'Error de seguridad crítico: El servidor no puede arrancar en producción porque JWT_SECRET no está configurada o contiene un valor de relleno no seguro (.env.example). Genera una clave aleatoria de al menos 32 caracteres (ej: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))").';
    throw new Error(errorMsg);
  }

  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (adminPassword && isForbiddenPlaceholder(adminPassword)) {
    const errorMsg =
      'Error de seguridad crítico: El servidor no puede arrancar en producción porque ADMIN_PASSWORD contiene una contraseña de ejemplo o relleno prohibida (.env.example). Por favor, define una contraseña propia y segura.';
    throw new Error(errorMsg);
  }
}
