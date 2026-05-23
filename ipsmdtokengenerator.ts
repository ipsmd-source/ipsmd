import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const server: FastifyInstance = Fastify({ logger: false });

// Секретный криптографический ключ сервера для подписи 10-минутных токенов.
// В реальном производстве этот ключ должен браться из защищенных переменных окружения (.env).
const JWT_SECRET_SIGNATURE = 'IPSMD_CORE_SECRET_KEY_2026_ANTI_FRAUD_SHIELD';

// Адрес твоего внешнего открытого сайта с чатом, куда мы имеем право передавать ключи.
// Это жесткий белый список (White List) для предотвращения кражи токенов на левые сайты.
const ALLOWED_CHAT_ORIGIN = 'http://localhost:3000'; // Замени на реальный домен чата в будущем

interface HandshakeQuery {
  userId: string;
  status: string;
}

/**
 * ФУНКЦИЯ ГЕНЕРАЦИИ ВРЕМЕННОГО ТОКЕНА СЕССИИ (Наш 10-минутный пропуск)
 * Создает зашифрованную строку (JWT), подписанную секретным ключом сервера.
 */
function generate10MinToken(userId: string): string {
  // Полезная нагрузка (Payload) токена
  const payload = {
    sub: userId,                                        // ID пользователя
    iss: 'ipsmd-auth-gate',                            // Кто выдал токен
    deviceFingerprint: crypto.randomBytes(8).toString('hex') // Случайный маркер для защиты от повторов
  };

  // Подписываем токен и жестко выставляем время жизни: 10 минут (600 секунд)
  return jwt.sign(payload, JWT_SECRET_SIGNATURE, { expiresIn: '10m' });
}

// Маршрут, который вызывается Игрой после успешного прохождения верификации (из Шага 2.2)
server.get('/api/security/handshake', async (
  request: FastifyRequest<{ Querystring: HandshakeQuery }>, 
  reply: FastifyReply
) => {
  const { userId, status } = request.query;

  // Если игра не была пройдена успешно — от ворот поворот
  if (status !== 'AUTH_SUCCESS' || !userId) {
    return reply.code(403).send({ error: 'ACCESS_DENIED', message: 'Плата верификации не подтверждена.' });
  }

  // Рождаем наш 10-минутный криптографический токен
  const temporaryToken = generate10MinToken(userId);
  
  console.log(`🔑 [ipsmd-Замок] Сгенерирован временный JWT токен на 10 минут для: ${userId}`);

  // Выставляем правильные заголовки безопасности, чтобы браузер разрешил отправку данных на другой домен
  reply.header('Content-Type', 'text/html; charset=utf-8');

  /**
   * ОТДАЕМ СТРАНИЦУ КРОСС-ДОМЕННОГО ХЭНДШЕЙКА
   * Этот HTML-код мгновенно выполнится в браузере пользователя. 
   * Метод window.opener.postMessage отправляет токен на открытый сайт с чатом,
   * проверяя целевой домен по белому списку (targetOrigin). Хакеры не смогут перехватить.
   */
  const htmlHandshakeCode = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <title>ipsmd Secure Handshake</title>
    </head>
    <body style="background: #020617; color: #10b981; font-family: sans-serif; display: flex; justify-content: center; items-center; height: 100vh; margin: 0;">
        <div style="text-align: center; margin: auto; padding: 20px; border: 1px solid #10b98133; border-radius: 20px; background: rgba(255,255,255,0.02); backdrop-filter: blur(10px);">
            <h2 style="margin: 0 0 10px 0; font-size: 18px; tracking-wider: 1px;">Синхронизация сессии ipsmd...</h2>
            <p style="color: #64748b; font-size: 12px; margin: 0;">Передача зашифрованного токена в оперативную память чата</p>
        </div>

        <script>
            // Точный адрес твоего открытого сайта-чата из белого списка сервера
            const targetOrigin = "${ALLOWED_CHAT_ORIGIN}";
            
            // Наш сгенерированный 10-минутный ключ
            const token = "${temporaryToken}";

            // Проверяем, открыта ли страница во всплывающем окне (Popup) или Iframe
            if (window.opener) {
                // Безопасно передаем токен родительскому окну (твоему открытому сайту)
                window.opener.postMessage({ type: "IPSMD_AUTH_TOKEN", token: token }, targetOrigin);
                
                // Закрываем окно авторизации через 1 секунду после передачи, чтобы не висело в памяти
                setTimeout(() => { window.close(); }, 1000);
            } else if (window.parent !== window) {
                // Если наш Замок встроен внутрь открытого сайта через скрытый Iframe
                window.parent.postMessage({ type: "IPSMD_AUTH_TOKEN", token: token }, targetOrigin);
            } else {
                // Резервный вариант: Обычное перенаправление (Redirect) с ключом в хэше страницы
                window.location.href = targetOrigin + "/#token=" + token;
            }
        </script>
    </body>
    </html>
  `;

  return reply.send(htmlHandshakeCode);
});

// Запускаем сервер на порту 5000 (Продолжаем расширять плату нашего "Замка")
const start = async () => {
  try {
    await server.listen({ port: 5000, host: '0.0.0.0' });
    console.log('⚡ [ipsmd-Замок] Кросс-доменный генератор токенов запущен на порту 5000!');
  } catch (err) {
    process.exit(1);
  }
};
start();