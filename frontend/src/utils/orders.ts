export const formatOrderCode = (documentId: string) => {
  if (!documentId) {
    return "N/A";
  }

  let hashNumerico = 0;
  for (let i = 0; i < documentId.length; i++) {
    hashNumerico =
      documentId.charCodeAt(i) + ((hashNumerico << 5) - hashNumerico);
  }

  const numeroCorto = Math.abs(hashNumerico % 9000) + 1000;

  return `#PED-${numeroCorto}`;
};
