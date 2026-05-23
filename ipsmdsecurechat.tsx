import React, { useState, useEffect, useRef } from 'react';

// Структура расшифрованных данных токена авторизации
interface ChatSession {
  userId: string;
  expiresAt: number; // Время уничтожения сессии (Unix Time в мс)
}

// Структура простого сообщения (на Шаге 3.3 мы завернем сюда шифрование букв)
interface Message {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
}

export default function IpsmdSecureChat() {
  // Ключевые регистры состояний нашего чата
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 минут обратного отсчета

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ссылка на наш секретный Сервер-Замок (из Блока 2)
  const SECURE_AUTH_GATE_ORIGIN = 'http://localhost:5000';

  useEffect(() => {
    /**
     * СЛУШАТЕЛЬ КРОСС-ДОМЕННОГО МОСТА
     * Перехватывает токен из оперативной памяти, пересланный нашей игрой
     */
    const handleAuthMessage = (event: MessageEvent) => {
      // ПРЕДОХРАНИТЕЛЬ: Проверяем домен отправителя по белому списку
      if (event.origin !== SECURE_AUTH_GATE_ORIGIN) return;

      if (event.data && event.data.type === 'IPSMD_AUTH_TOKEN') {
        const receivedToken = event.data.token;
        setToken(receivedToken);

        try {
          // Декодируем тело (payload) JWT токена
          const base64Url = receivedToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));

          const currentTime = Math.floor(Date.now() / 1000);
          
          // Проверяем срок годности пропуска (10 минут)
          if (payload.exp && payload.exp > currentTime) {
            setSession({
              userId: payload.sub,
              expiresAt: payload.exp * 1000
            });
            setIsAuthorized(true);
            
            // Инициализируем приветственные сообщения в чате
            setMessages([
              { id: 1, sender: 'Система ipsmd', text: 'Успешное подключение к защищенному каналу.', timestamp: '00:00' },
              { id: 2, sender: 'Бот-Садовник', text: 'Привет! Твои чаты под надежной защитой. Вся память сотрется через 10 минут.', timestamp: '00:01' }
            ]);
            console.log(`✓ [Чат ipsmd] Ключ сессии пользователя ${payload.sub} успешно активирован.`);
          }
        } catch (err) {
          console.error('✕ [Чат ipsmd] Повреждена структура токена:', err);
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  // Жесткий автовыход с полной зачисткой оперативной памяти
  const handleLogout = () => {
    setToken(null);
    setSession(null);
    setIsAuthorized(false);
    setMessages([]);
    console.log('🚨 [Чат ipsmd] Сессия уничтожена. Переписка стерта из RAM без следов на диске.');
  };

  // Счетчик времени жизни сессии (Синхронизирован со Скриптом-Киллером из Шага 2.4)
  useEffect(() => {
    if (!session || !isAuthorized) return;

    const interval = setInterval(() => {
      const remaining = Math.round((session.expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        handleLogout(); // Сжигаем мосты, если 10 минут вышли
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isAuthorized]);

  // Плавный автоматический скролл чата вниз при получении новых сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Отправка сообщений в чат
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage: Message = {
      id: Date.now(),
      sender: 'Вы',
      text: inputText,
      // На Шаге 3.3 мы внедрим сюда отправку временного Пинга на Шаг 2.4 для сброса 10-минутного таймера
      timestamp: timeStr
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
  };

  // Вызов всплывающего окна авторизации с Цветком-Радугой
  const openAuthWindow = () => {
    const width = 550;
    const height = 700;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      `${SECURE_AUTH_GATE_ORIGIN}/api/security/handshake?userId=client_ipsmd&status=AUTH_SUCCESS`,
      'ipsmd Secure Chat Authentication',
      `width=${width},height=${height},top=${top},left=${left}`
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-white font-sans select-none">
      
      {!isAuthorized ? (
        // ==========================================
        // ЭКРАН 1: ОЖИДАНИЕ АВТОРИЗАЦИИ (Чат заблокирован)
        // ==========================================
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center justify-center text-2xl mb-4 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            💬
          </div>
          <h1 className="text-xl font-bold tracking-wider text-slate-200">Безопасный Чат ipsmd</h1>
          <p className="text-xs text-slate-400 mt-2 max-w-xs">
            Личные переписки запечатаны. Чтобы войти в чат, наклоните Цветок-Радугу и поймайте нужные Капли Росы.
          </p>

          <button
            onClick={openAuthWindow}
            className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-semibold tracking-wider uppercase py-3.5 px-6 rounded-2xl shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 active:scale-95 duration-100 transition-all"
          >
            Войти в защищенный чат
          </button>
        </div>
      ) : (
        // ==========================================
        // ЭКРАН 2: РАБОЧИЙ ИНТЕРФЕЙС ЧАТА (Вход выполнен)
        // ==========================================
        <div className="w-full max-w-lg h-[550px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          
          {/* Верхняя панель чата */}
          <div className="bg-black/20 p-4 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <h2 className="text-sm font-bold tracking-wide">Безопасный канал ipsmd</h2>
                <span className="text-[9px] text-slate-400 block font-mono">ID: {session?.userId}</span>
              </div>
            </div>
            {/* Таймер уничтожения данных */}
            <div className="text-right flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-[8px] text-slate-500 uppercase">Самоуничтожение RAM через:</span>
                <span className={`font-mono text-xs font-bold ${timeLeft < 60 ? 'text-rose-400' : 'text-indigo-400'}`}>
                  {Math.floor(timeLeft / 60)}м {timeLeft % 60}с
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="text-[10px] uppercase font-mono tracking-wider border border-white/10 bg-white/5 px-2.5 py-1 rounded-xl hover:bg-white/10 active:scale-95 transition-all"
              >
                Стереть
              </button>
            </div>
          </div>

          {/* Окно вывода сообщений */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/40 shadow-inner custom-scrollbar">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[80%] p-3 rounded-2xl border text-xs transition-all ${msg.sender === 'Вы' 
                  ? 'ml-auto bg-indigo-600/20 border-indigo-500/30 text-indigo-100 rounded-br-none' 
                  : 'bg-black/30 border-white/5 text-slate-200 rounded-bl-none'}`}
              >
                <span className="text-[9px] text-slate-500 font-bold mb-1">{msg.sender}</span>
                <p className="leading-relaxed break-words font-sans">{msg.text}</p>
                <span className="text-[8px] text-slate-500 font-mono text-right mt-1 block">{msg.timestamp}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Форма ввода текста сообщения */}
          <form onSubmit={handleSendMessage} className="p-3 bg-black/20 border-t border-white/5 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Напишите сообщение..."
              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-md shadow-indigo-600/20"
            >
              Отправить
            </button>
          </form>

        </div>
      )}

    </div>
  );
}