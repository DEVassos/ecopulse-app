// Entrega de arquivo gerado no navegador (#24): sem rota nova no backend.

/** Baixa `content` como arquivo: um link temporário para um Blob, clicado e liberado em seguida. */
export function downloadText(content: string, fileName: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Depois do clique o navegador já tem o arquivo; liberar no próximo ciclo evita cancelar o download em alguns navegadores
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
