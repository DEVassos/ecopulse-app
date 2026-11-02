import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Brand from './Brand';
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
