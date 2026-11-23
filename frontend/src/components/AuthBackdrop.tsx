import { useEffect, useRef, useState } from 'react';
import loginBackground from '../assets/login-background.mp4';
import './AuthBackdrop.css';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Vídeo em looping atrás do cartão das telas de acesso. É decoração: fica sempre sem som, fora da
 * árvore de acessibilidade e sob um véu, para o formulário continuar legível em qualquer quadro.
 * Quem pediu menos movimento no sistema recebe só o fundo em gradiente do AuthLayout; o mesmo
 * acontece se o navegador barrar o autoplay ou o arquivo falhar (nada de quadro parado "morto").
 */
export default function AuthBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Lido antes de montar o <video>: assim o arquivo nem é baixado quando a animação está dispensada
  const [moving, setMoving] = useState(() => !window.matchMedia(REDUCED_MOTION).matches);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const update = () => setMoving(!query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // O autoplay só é liberado com áudio desligado, e o atributo `muted` do JSX nem sempre chega ao DOM
    video.muted = true;
    void video.play().catch(() => setFailed(true));
  }, [moving]);

  if (!moving || failed) return null;

  return (
    <div className="auth-backdrop" aria-hidden="true">
      <video
        ref={videoRef}
        className="auth-backdrop-video"
        src={loginBackground}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
        disablePictureInPicture
        onError={() => setFailed(true)}
      />
      <div className="auth-backdrop-veil" />
    </div>
  );
}
