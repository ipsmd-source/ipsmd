import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';

const server: FastifyInstance = Fastify({ logger: false });

// Словарь из 32 простых слов для генерации фразы (в продакшене лучше взять стандарт BIP-39 на 2048 слов)
// Мы используем простые слова, чтобы любая бабушка могла легко переписать их карандашом в блокнот
const IPSMD_WORDS_DICTIONARY = [
  'flower', 'water', 'earth', 'sun', 'root', 'leaf', 'seed', 'garden',
  'device', 'copper', 'sensor', 'signal', 'volt', 'ampere', 'cable', 'board',
  'shield', 'green', 'rainbow', 'drop', 'dew', 'cloud', 'rain', 'forest',
  'button', 'timer', 'pulse', 'relay', 'power', 'battery', 'matrix', 'crystal'
];

interface UserSecurityData {
  userId: string;
  masterKeyFingerprint: string; // "Цифровой паспорт" текущего доверенного устройства
  recoveryPhraseHash: string;   // SHA-256 хэш от бумажной фразы из 12 слов
}

// Эмуляция нашей базы данных (RAM-регистр)
const dbUserSecurity: Map<string, UserSecurityData> = new Map();

/**
 * ФУНКЦИЯ ГЕНЕРАЦИИ БУМАЖНОЙ ФРАЗЫ (12 слов)
 * Выбирает случайные слова из словаря с помощью криптографически стойкого генератора
 */
function generate12WordPhrase(): string[] {
  const phrase: string[] = [];
  for (let i = 0; i < 12; i++) {
    // Получаем по-настоящему случайный индекс внутри нашего словаря
    const randomIndex = crypto.randomInt(0, IPSMD_WORDS_DICTIONARY.length);
    phrase.push(IPSMD_WORDS_DICTIONARY[randomIndex]);
  }
  return phrase;
}

/**
 * ХЭШИРОВАНИЕ ФРАЗЫ ВОССТАНОВЛЕНИЯ
 * Переводит строку из 12 слов в SHA-256 хэш. На сервере саму фразу хранить НЕЛЬЗЯ!
 */
function hashPhrase(phraseArray: string[]): string {
  const cleanPhrase = phraseArray.map(w => w.trim().toLowerCase()).join(' ');
  return crypto.createHash('sha256').update(cleanPhrase).digest('hex');
}

// МАРШРУТ 1: ПЕРВИЧНАЯ РЕГИСТРАЦИЯ (Выдача 12 слов и привязка первого устройства)
server.post('/api/security/init-recovery', async (request: FastifyRequest<{ Body: { userId: string, deviceFingerprint: string } }>, reply: FastifyReply) => {
  const { userId, deviceFingerprint } = request.body;

  if (!userId || !deviceFingerprint) {
    return reply.code(400).send({ error: 'BAD_DATA', message: 'Не указан ID пользователя или слепок устройства.' });
  }

  // Генерируем 12 слов
  const rawPhraseArray = generate12WordPhrase();
  const phraseHash = hashPhrase(rawPhraseArray);

  // Сохраняем в базу: привязываем текущее устройство и хэш фразы
  dbUserSecurity.set(userId, {
    userId,
    masterKeyFingerprint: deviceFingerprint,
    recoveryPhraseHash: phraseHash
  });

  console.log(`📝 [ipsmd-Замок] Для пользователя ${userId} создана аварийная карта. Хэш фразы сохранен.`);

  // Отдаем чистые 12 слов пользователю ОДИН РАЗ при регистрации, чтобы он записал их на бумагу
  return reply.code(201).send({
    success: true,
    recoveryPhrase: rawPhraseArray.join(' '),
    message: 'ВНИМАНИЕ! Запишите эти 12 слов на бумагу. Это единственный способ спасти чат при потере телефона!'
  });
});

// МАРШРУТ 2: АВАРИЙНОЕ ВОССТАНОВЛЕНИЕ ДОСТУПА (Если телефон потерян / украден)
server.post('/api/security/recover-access', async (request: FastifyRequest<{ Body: { userId: string, enteredPhrase: string, newDeviceFingerprint: string } }>, reply: FastifyReply) => {
  const { userId, enteredPhrase, newDeviceFingerprint } = request.body;

  if (!userId || !enteredPhrase || !newDeviceFingerprint) {
    return reply.code(400).send({ error: 'BAD_DATA' });
  }

  const record = dbUserSecurity.get(userId);
  if (!record) {
    return reply.code(404).send({ error: 'USER_NOT_FOUND', message: 'Пользователь не зарегистрирован в системе защиты.' });
  }

  // Переводим введенные пользователем слова в SHA-256 хэш
  const enteredPhraseArray = enteredPhrase.split(' ');
  const calculatedHash = hashPhrase(enteredPhraseArray);

  // Сверяем хэш введенной фразы с тем, что лежит в нашей базе данных
  if (calculatedHash === record.recoveryPhraseHash) {
    
    // --- ОПЕРАЦИЯ "ВЫЖЖЕННАЯ ЗЕМЛЯ" ---
    const oldDevice = record.masterKeyFingerprint;
    console.log(`🚨 [Аварийный модуль] Бумажный ключ СОВПАЛ! Жесткое аннулирование старого устройства: ${oldDevice}`);

    // Перезаписываем "Цифровой паспорт" — привязываем НОВОЕ устройство, старое мгновенно блокируется
    record.masterKeyFingerprint = newDeviceFingerprint;
    dbUserSecurity.set(userId, record);

    console.log(`✓ [ipsmd-Замок] Новый Главный ключ привязан: ${newDeviceFingerprint}. Доступ восстановлен.`);
    
    return reply.send({ 
      success: true, 
      message: 'Старое устройство полностью стерто из системы. Новый телефон успешно зарегистрирован!' 
    });
  } else {
    // Если фраза не совпала — блокируем операцию
    console.log(`✕ [Аварийный модуль] Ошибка восстановления для ${userId}. Неверная мнемоническая фраза.`);
    return reply.code(401).send({ error: 'INVALID_RECOVERY_PHRASE', message: 'Ошибка! Бумажный ключ не совпадает.' });
  }
});

// Запуск сервера на порту 5000 (Блок 2 полностью готов)
const start = async () => {
  try {
    await server.listen({ port: 5000, host: '0.0.0.0' });
    console.log('⚡ [ipsmd-Замок] Серверный модуль аварийного восстановления запущен на порту 5000!');
  } catch (err) {
    process.exit(1);
  }
};
start();