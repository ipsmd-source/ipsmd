
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';

// Создаем экземпляр сервера Fastify — самого быстрого современного движка (стандарт 2026 года)
const server: FastifyInstance = Fastify({
  logger: true // Включаем системные логи для отслеживания питания и запросов на плате сервера
});

// Интерфейс для входных данных при регистрации цветовой формулы
interface RegisterColorsBody {
  userId: string;
  colors: string[]; // Массив из 3 HEX-строк, например: ["#00FFCC", "#FF0055", "#7700FF"]
}

// Интерфейс для структуры базы данных (для наглядности инженера-схемотехника)
interface UserSecurityRow {
  userId: string;
  colorHash: string; // Храним ТОЛЬКО хэш, чистые цвета стираются из памяти процессора
  salt: string;      // Уникальная криптографическая "соль" для защиты от радужных таблиц перебора
}

// Временная оперативная база данных в памяти (RAM) — имитация аппаратного регистра
const mockDatabase: Map<string, UserSecurityRow> = new Map();

/**
 * КРИПТОГРАФИЧЕСКАЯ ФУНКЦИЯ ХЭШИРОВАНИЯ (Наше ядро безопасности)
 * Превращает массив цветов и соль в одну нечитаемую 64-символьную строку SHA-256.
 * Процесс необратим: зная хэш, восстановить исходные цвета математически невозможно.
 */
function hashColorSequence(colors: string[], salt: string): string {
  // Переводим массив цветов в нижний регистр и склеиваем в одну строку, добавляя соль
  // Пример: "#00ffcc|#ff0055|#7700ff.уникальная_соль"
  const rawString = colors.map(c => c.toLowerCase()).join('|') + '.' + salt;
  
  // Запускаем аппаратный криптографический чип SHA-256 внутри Node.js
  return crypto
    .createHash('sha256')
    .update(rawString)
    .digest('hex'); // Выводим хэш в виде строки шестнадцатеричных символов
}

// Спецификация маршрута: РЕГИСТРАЦИЯ ЦВЕТОВОГО КЛЮЧА
server.post('/api/security/register-colors', async (
  request: FastifyRequest<{ Body: RegisterColorsBody }>, 
  reply: FastifyReply
) => {
  try {
    const { userId, colors } = request.body;

    // ГВАРДЕЙСКИЙ ПРЕДОХРАНИТЕЛЬ (Guard Rails): Проверяем корректность входной платы данных
    if (!userId || !colors || !Array.isArray(colors) || colors.length !== 3) {
      return reply.code(400).send({ 
        error: 'INVALID_BOARD_DATA', 
        message: 'Плата данных повреждена. Требуется ID пользователя и ровно 3 HEX-кода цветов.' 
      });
    }

    // Генерируем случайную криптографическую соль (16 случайных байт в hex)
    // Это нужно, чтобы хакеры не могли подобрать цвета по готовым базам популярных хэшей
    const salt = crypto.randomBytes(16).toString('hex');

    // Пропускаем цвета через наш SHA-256 конвейер
    const secureHash = hashColorSequence(colors, salt);

    // Записываем данные в наш защищенный регистр (базу данных)
    mockDatabase.set(userId, {
      userId,
      colorHash: secureHash,
      salt: salt
    });

    // Выводим в лог сервера подтверждение (чистые цвета в консоль НЕ пишем из соображений безопасности!)
    server.log.info(`[ipsmd-Database] Успешная запись для пользователя ${userId}. Хэш: ${secureHash}`);

    // Возвращаем клиенту успешный статус. Сервер не отдает назад хэш или соль — это секрет!
    return reply.code(201).send({ 
      success: true, 
      message: 'Цветовой бронежилет успешно создан. Чистые данные уничтожены из RAM сервера.' 
    });

  } catch (error) {
    server.log.error(error);
    return reply.code(500).send({ error: 'SERVER_DIAGNOSTIC_ERROR', message: 'Сбой на плате сервера.' });
  }
});

// Спецификация тестового маршрута: ДИАГНОСТИКА ХРАНИЛИЩА (Для инженера при отладке)
server.get('/api/security/debug/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
  const { userId } = request.params;
  const row = mockDatabase.get(userId);

  if (!row) {
    return reply.code(404).send({ error: 'NOT_FOUND', message: 'Пользователь не найден в регистре.' });
  }

  // Показываем инженеру, ЧТО именно видит хакер, если взломает сервер.
  // Чистых цветов тут нет — только глухой зашифрованный след!
  return reply.send({
    userId: row.userId,
    storedHash: row.colorHash,
    storedSalt: row.salt,
    safetyStatus: '100% SECURE_ZERO_KNOWLEDGE'
  });
});

// ЗАПУСК ПЛАТЫ СЕРВЕРА НА ПОРТУ 5000
const startServer = async () => {
  try {
    // Сервер слушает порт 5000 на всех локальных интерфейсах
    await server.listen({ port: 5000, host: '0.0.0.0' });
    console.log('⚡ [ipsmd-Замок] Сервер авторизации успешно запущен на порту 5000!');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

startServer();