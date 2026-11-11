/** La demostración se activa solo con ?demo=1 y permanece explícita al navegar. */
export function modoDemostracionActivo(): boolean {
 return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
}
