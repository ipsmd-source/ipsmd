import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';

const server: FastifyInstance = Fastify({ logger: false });

const JWT_SECRET_SIGNATURE = 'IPSMD_CORE_SECRET_KEY_2026_ANTI_FRAUD_SHIELD';

// Структура регистра активных сессий в памяти сервера (наша RAM-таблица)
interface ActiveSession {
  userId: string;
  lastActivity: number; // Время последней фиксации активности в миллисекундах (Unix Time)
  token: string;
}

// Оперативная память сервера, где мы храним все живые сессии
const activeSessionsRegistry: Map<string, ActiveSession> = new Map();

// Жесткий лимит бездействия пользователя: 10 минут (600 000 миллисекунд)
const MAX_INACTIVITY_TIME_MS = 10 * 60 * 1000; 

/**
 * АППАРАТНЫЙ СКРИПТ-КИЛЛЕР (Счетчик Гейгера для просроченных сессий)
 * Запускается циклически каждые 5 секунд, сканирует регистры и жестко 
 * уничтожает сессии, которые бездействовали больше 10 минут.
 */
setInterval(() => {
  const currentTime = Date.now();
  
  activeSessionsRegistry.forEach((session, userId) => {
    const inactivityDuration = currentTime - session.lastActivity;
    
    // Если время бездействия превысило 10 минут — сжигаем мосты!
    if (inactivityDuration > MAX_INACTIVITY_TIME_MS) {
      console.log(`🚨 [Скрипт-Киллер ipsmd] СЕССИЯ УНИЧТОЖЕНА! Пользователь ${userId} бездействовал ${Math.round(inactivityDuration / 1000)} сек.`);
      
      // Стираем сессию из памяти сервера наглухо
      activeSessionsRegistry.delete(userId);
      
      // Здесь в Блоке 3 мы прикрутим команду WebSocket чату: жестко разорвать соединение с этим клиентом
    }
  });
}, 5000); // Проверка регистра идет непрерывно каждые 5 секунд

// Маршрут 1: ФИКСАЦИЯ АКТИВНОСТИ (Вызывается сайтом при кликах/скролле пользователя)
server.post('/api/security/ping-activity', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Линия связи не авторизована.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Декодируем и проверяем цифровую подпись токена
    const decoded = jwt.verify(token, JWT_SECRET_SIGNATURE) as { sub: string };
    const userId = decoded.sub;

    const currentSession = activeSessionsRegistry.get(userId);

    if (!currentSession) {
      // Если сессия уже была убита таймером — возвращаем жесткий отказ
      return reply.code(403).send({ 
        error: 'SESSION_EXPIRED', 
        message: '10 минут бездействия истекли. Доступ заблокирован, вернитесь к Цветку-Радуге.' 
      });
    }

    // СБРОС ТАЙМЕРА: Обновляем время последней активности текущим системным временем
    currentSession.lastActivity = Date.now();
    activeSessionsRegistry.set(userId, currentSession);

    return reply.send({ success: true, status: 'SESSION_ALIVE', message: 'Активность зафиксирована. Счетчик сброшен.' });

  } catch (err) {
    return reply.code(401).send({ error: 'INVALID_TOKEN', message: 'Ключ сессии поврежден или подделан хакерами.' });
  }
});

// Маршрут 2: АКТИВАЦИЯ СЕССИИ (Вызывается Хэндшейком из Шага 2.3 после успешной игры)
server.post('/api/security/activate-session', async (request: FastifyRequest<{ Body: { userId: string, token: string } }>, reply: Reply) => {
  const { userId, token } = request.body;
  
  if (!userId || !token) {
    return reply.code(400).send({ error: 'BAD_REQUEST' });
  }

  // Записываем новую сессию в регистр, выставляя стартовую точку активности
  activeSessionsRegistry.set(userId, {
    userId,
    token,
    lastActivity: Date.now() // Стартуем отсчет 10 минут прямо сейчас
  });

  console.log(`⏱️ [ipsmd-Замок] Таймер бездействия на 10 минут запущен для пользователя: ${userId}`);
  return reply.send({ success: true });
});

// Запуск сервера на порту 5000 (Плата полностью укомплектована логикой таймеров)
const start = async () => {
  try {
    await server.listen({ port: 5000, host: '0.0.0.0' });
    console.log('⚡ [ipsmd-Замок] Серверный скрипт-киллер сессий запущен на порту 5000!');
  } catch (err) {
    process.exit(1);
  }
};
start();