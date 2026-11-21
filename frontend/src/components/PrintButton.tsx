/**
 * Impressão / PDF das páginas que viram relatório (#408): não gera arquivo, abre a impressão do navegador, onde se escolhe
 * "Salvar como PDF". A folha (A4, tema claro, sem menu) sai pelo `styles/print.css`; este botão some no papel.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      className="btn-outline inline-flex min-h-8 cursor-pointer items-center gap-2 px-3 text-sm"
      title="Abre a impressão do navegador: escolha Salvar como PDF"
      onClick={() => window.print()}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-4"
      >
        <path d="M6 9V3h12v6" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </svg>
      Imprimir / PDF
    </button>
  );
}
