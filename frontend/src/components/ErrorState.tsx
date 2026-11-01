interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/60 bg-error/10 px-5 py-4" role="alert">
      <span className="text-text">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-outline min-h-10 px-4 text-sm"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
