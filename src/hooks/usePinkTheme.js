import { useState, useEffect } from 'react';
import { pink } from '../constants/themes';

function isNightInItaly() {
  const romeHour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Rome',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10
  );
  return romeHour >= 19 || romeHour < 6;
}

export function usePinkTheme() {
  const [isNight, setIsNight] = useState(isNightInItaly());

  useEffect(() => {
    const interval = setInterval(() => {
      const night = isNightInItaly();
      setIsNight(prev => (prev !== night ? night : prev));
    }, 60 * 1000); // checa a cada 1 minuto

    return () => clearInterval(interval);
  }, []);

  return isNight ? pink.night : pink.day;
}
