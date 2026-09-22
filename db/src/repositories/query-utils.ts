/** Makes user input safe to drop into a `RegExp` for a `contains` search. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
