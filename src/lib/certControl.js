// Código interno único de controle do certificado — independente do QR Code e do código público
export function gerarCodigoInternoControle() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CTRL-${ts}-${rand}`;
}