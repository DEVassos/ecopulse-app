import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';
import './AuthLayout.css';

interface Props {
  title: string;
  description: string;
  children: ReactNode;
}

/** Moldura das telas de acesso: marca, cartão central e rodapé. */
export default function AuthLayout({ title, description, children }: Props) {
  return (
    <div className="auth-page">
      {/* O login não tem cabeçalho: o botão de tema fica no canto, como no resto do produto (#265) */}
      <div className="auth-theme">
        <ThemeToggle />
      </div>
      <main className="auth-main">
        <Link className="auth-brand" to="/" aria-label="EcoPulse — voltar ao dashboard">
          <Brand />
        </Link>

        <section className="auth-card" aria-labelledby="auth-title">
          <h1 id="auth-title">{title}</h1>
          <p className="auth-lead">{description}</p>
          {children}
        </section>
      </main>

      <footer className="auth-footer">EcoPulse · DEVassos · Fatec Jacareí 2DSM 2026-2</footer>
    </div>
  );
}
