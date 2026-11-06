// Presentation helper: derives a URL slug from a display name.
// The real slug is owned by the taxonomy provider; this only proposes a value for review.
export function generarSlug(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
