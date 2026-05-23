import React, { useState, useEffect } from 'react';

// Интерфейс для расшифрованных данных токена (чтобы админка знала, кто вошел)
interface AdminSession {
  userId: string;
  expiresAt: number; // Время сгорания сессии в мс (Unix Time)
}

export default function IpsmdAdminPanel() {
  // Ключевые состояния: есть ли доступ, данные сессии и системные логи
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  
  // Имитация данных управления умными платами ipsmd на подоконниках
  const [greenhouseStatus, setGreenhouseStatus] = useState({
    soilMoisture: 'Оптимальная (42%)',
    waterLevel: 'Полный бак (85%)',
    vramFps: '120 Hz',
    motorStatus: 'Ожидание сухого хода'
  });

  // Адрес нашего секретного Сервера-Замка (откуда мы ждем безопасный postMessage)
  const SECURE_AUTH_GATE_ORIGIN = 'http://localhost:5000'; // Домен нашего Замка из Блока 2

  useEffect(() => {
    /**
     * СЛУШАТЕЛЬ СЕКРЕТНОГО МОСТА (Браузерное рукопожатие)
     * Этот метод перехватывает токен, который страница хэндшейка (из Шага 2.3)
     * пересылает напрямую в оперативную память нашей вкладки админки.
     */
    const handleAuthMessage = (event: MessageEvent) => {
      // КРИТИЧЕСКИЙ ПРЕДОХРАНИТЕЛЬ: Проверяем, что пакет прилетел именно с нашего защищенного сервера!
      // Если домен отправителя не совпадает — жестко игнорируем, это может быть хакерская подмена.
      if (event.origin !== SECURE_AUTH_GATE_ORIGIN) return;

      // Проверяем тип системного пакета ipsmd
      if (event.data && event.data.type === 'IPSMD_AUTH_TOKEN') {
        const receivedToken = event.data.token;
        setToken(receivedToken);
        
        // --- ДЕКОДИРОВАНИЕ JWT ТОКЕНА БЕЗ СЕРВЕРА (Прямо в браузере) ---
        try {
          const base64Url = receivedToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          
          // Проверяем, не просрочен ли токен (JWT выдается ровно на 10 минут)
          const currentTime = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp > currentTime) {
            setSession({
              userId: payload.sub,
              expiresAt: payload.exp * 1000
            });
            setIsAuthorized(true);
            console.log(`✓ [Админка ipsmd] Токен принят. Сессия админа ${payload.sub} подтверждена.`);
          } else {
            console.log('✕ [Админка ipsmd] Прилетел просроченный токен сессии.');
          }
        } catch (err) {
          console.error('✕ [Админка ipsmd] Ошибка парсинга структуры токена:', err);
        }
      }
    };

    // Вешаем слушатель на окно браузера
    window.addEventListener('message', handleAuthMessage);
    
    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []);

  // Функция принудительного выжигания сессии (Выход из админки)
  const handleLogout = () => {
    setToken(null);
    setSession(null);
    setIsAuthorized(false);
    console.log('🚨 [Админка ipsmd] Сессия закрыта вручную. Оперативная память очищена.');
  };

  // Метод открытия всплывающего окна нашей игры с Цветком-Радугой (Шаг 1.4 + Шаг 2.3)
  const openAuthWindow = () => {
    // Открываем секретный сервер авторизации в отдельном Popup-окне
    const width = 550;
    const height = 700;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      `${SECURE_AUTH_GATE_ORIGIN}/api/security/handshake?userId=admin_ipsmd&status=AUTH_SUCCESS`, // В продакшене тут будет вызов веб-сокета игры
      'ipsmd Secure Authentication',
      `width=${width},height=${height},top=${top},left=${left}`
    );
  };

  // Вычисляем, сколько секунд осталось до автоматического сгорания ключа
  const [timeLeft, setTimeLeft] = useState<number>(600);
  useEffect(() => {
    if (!session || !isAuthorized) return;
    
    const interval = setInterval(() => {
      const remaining = Math.round((session.expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        handleLogout(); // Жесткий автовыход, если 10 минут истекли
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isAuthorized]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-white font-sans select-none">
      
      {!isAuthorized ? (
        // ==========================================
        // ЭКРАН 1: БЛОКИРОВКА ДОСТУПА (Дверь на замке)
        // ==========================================
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            🔒
          </div>
          <h1 className="text-xl font-bold tracking-wider text-slate-200">Панель управления ipsmd</h1>
          <p className="text-xs text-slate-400 mt-2 max-w-xs">
            Доступ заблокирован аппаратным крипто-щитом. Для входа в админку требуется синхронизация с Цветком-Радугой.
          </p>

          <button
            onClick={openAuthWindow}
            className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-semibold tracking-wider uppercase py-3.5 px-6 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:opacity-90 active:scale-95 duration-100 transition-all"
          >
            Войти через ipsmd Secure
          </button>
        </div>
      ) : (
        // ==========================================
        // ЭКРАН 2: ДОСТУП РАЗРЕШЕН (Интерфейс Админки 2026)
        // ==========================================
        <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col">
          
          {/* Верхний статус-бар */}
          <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block">Авторизован: {session?.userId}</span>
              <h1 className="text-xl font-black font-mono tracking-wide">ipsmd CONTROL PANEL</h1>
            </div>
            <div className="text-right flex items-center gap-4">
              {/* Наш 10-минутный таймер-убийца на экране */}
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-slate-400 uppercase">Сброс ключа через:</span>
                <span className={`font-mono text-sm font-bold ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                  {Math.floor(timeLeft / 60)}м {timeLeft % 60}с
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="text-xs border border-rose-500/30 bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-xl hover:bg-rose-500/20 active:scale-95 transition-all"
              >
                Выйти
              </button>
            </div>
          </div>

          {/* Панель управления транзисторными блоками цветов */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Датчик 1 (Влажность почвы)</span>
              <span className="text-lg font-bold text-slate-200">{greenhouseStatus.soilMoisture}</span>
            </div>

            <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Датчик 2 (Бак автополива)</span>
              <span className="text-lg font-bold text-slate-200">{greenhouseStatus.waterLevel}</span>
            </div>

            <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Аппаратный буфер вывода</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">{greenhouseStatus.vramFps}</span>
            </div>

            <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Транзисторный ключ мотора</span>
              <span className="text-lg font-bold text-indigo-400">{greenhouseStatus.motorStatus}</span>
            </div>

          </div>

          {/* Системный лог токена в памяти RAM */}
          <div className="w-full mt-6 bg-black/50 border border-white/5 rounded-xl p-3 font-mono text-[9px] text-slate-500 overflow-hidden truncate">
            <span className="text-slate-400 block mb-1">// Активный JWT-пропуск в оперативной памяти вкладки:</span>
            {token}
          </div>

        </div>
      )}

    </div>
  );
}