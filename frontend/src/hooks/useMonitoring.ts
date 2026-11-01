import { useContext } from 'react';
import { MonitoringContext } from '../contexts/MonitoringContext';
import type { MonitoringContextValue } from '../contexts/MonitoringContext';

export function useMonitoring(): MonitoringContextValue {
  const value = useContext(MonitoringContext);
  if (!value) throw new Error('useMonitoring precisa estar dentro do MonitoringProvider.');
  return value;
}
