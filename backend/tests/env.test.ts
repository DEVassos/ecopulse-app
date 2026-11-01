import { describe, expect, it } from 'vitest';
import { readEnvironment } from '../src/config/env';

describe('ambiente', () => {
  const databaseUrl = 'postgresql://user:pass@localhost/test';
  const environment = { DATABASE_URL: databaseUrl, JWT_SECRET: 'development-secret-123', JWT_EXPIRES_IN: '8h' };
  it.each(['0', '-1', '1.5', '2147483648', 'NaN', ''])('recusa polling inválido %s', POLLING_INTERVAL_MS => {
    expect(() => readEnvironment({ ...environment, POLLING_INTERVAL_MS })).toThrow('POLLING_INTERVAL_MS');
  });
  it('aceita limites do dispatcher', () => {
    for (const value of [1, 2147483647])
      expect(readEnvironment({ ...environment, POLLING_INTERVAL_MS: String(value) }).pollingIntervalMs).toBe(value);
  });
  it('aceita configuração válida e porta padrão', () => {
    expect(readEnvironment(environment)).toEqual({
      carbonApiUrl: 'https://carbon.unilaunch.org',
      port: 3000,
      databaseUrl,
      metricsApiUrl: 'https://metrics.unilaunch.org',
      pollingIntervalMs: 30000,
      jwtSecret: 'development-secret-123',
      jwtExpiresIn: '8h',
      corsOrigins: ['http://localhost:5173'],
    });
    expect(readEnvironment({ ...environment, PORT: '4321' }).port).toBe(4321);
  });
  it.each(['', '0', '65536', '1.5', '3e3', 'abc'])('recusa porta %s', PORT => {
    expect(() => readEnvironment({ ...environment, PORT })).toThrow('PORT');
  });
  it.each([undefined, '', 'https://localhost/db', 'postgresql://localhost/'])('recusa banco inválido', DATABASE_URL => {
    expect(() => readEnvironment({ ...environment, DATABASE_URL })).toThrow('DATABASE_URL');
  });
  it('lê a lista de origens do CORS', () => {
    expect(readEnvironment({ ...environment, CORS_ORIGIN: 'http://localhost:5173, https://ecopulse.example/' })
      .corsOrigins).toEqual(['http://localhost:5173', 'https://ecopulse.example']);
  });
  it.each(['', ' , ', 'localhost:5173', 'ftp://host', 'http://localhost:5173/app', 'http://u:p@host'])
    ('recusa origem de CORS inválida %j', CORS_ORIGIN => {
      expect(() => readEnvironment({ ...environment, CORS_ORIGIN })).toThrow('CORS_ORIGIN');
    });
  it('normaliza a base de carbono configurada', () => {
    expect(readEnvironment({ ...environment, CARBON_API_URL: 'http://localhost:8080/api/' }).carbonApiUrl)
      .toBe('http://localhost:8080/api');
  });
  it('usa o padrão oficial quando a base de carbono está vazia', () => {
    expect(readEnvironment({ ...environment, CARBON_API_URL: '' }).carbonApiUrl)
      .toBe('https://carbon.unilaunch.org');
  });
  it.each(['ftp://host', 'https://u:p@host', 'https://host/?key=x', 'https://host/#x'])
    ('recusa base de carbono inválida %s', CARBON_API_URL => {
      expect(() => readEnvironment({ ...environment, CARBON_API_URL })).toThrow('CARBON_API_URL');
    });
  it('aceita METRICS_API_URL própria e remove a barra final', () => {
    const env = readEnvironment({ ...environment, METRICS_API_URL: 'http://localhost:4000/' });
    expect(env.metricsApiUrl).toBe('http://localhost:4000');
  });
  it.each(['metrics.unilaunch.org', 'ftp://metrics.unilaunch.org', 'não é url'])('recusa METRICS_API_URL %s', METRICS_API_URL => {
    expect(() => readEnvironment({ ...environment, METRICS_API_URL })).toThrow('METRICS_API_URL');
  });
  it.each([undefined, '', 'short'])('recusa JWT_SECRET invalido', JWT_SECRET => {
    expect(() => readEnvironment({ ...environment, JWT_SECRET })).toThrow('JWT_SECRET');
  });
  it.each([undefined, '', 'not-a-duration', '-1h', '0', '0h', '3600'])('recusa JWT_EXPIRES_IN invalido', JWT_EXPIRES_IN => {
    expect(() => readEnvironment({ ...environment, JWT_EXPIRES_IN })).toThrow('JWT_EXPIRES_IN');
  });
});
