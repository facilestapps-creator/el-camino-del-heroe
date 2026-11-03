// Textos centralizados: si falta una clave, se muestra vacío y se avisa en consola.
export function textOf(bag, key) {
  const value = bag?.[key];
  if (typeof value !== 'string' || value === '') {
    console.warn('Falta la clave de texto:', key);
    return '';
  }
  return value;
}

// Plantilla con variables: "{city}" → valor. Los textos con variables se
// arman SIEMPRE desde data, nunca se concatenan en código.
export function fillText(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}
