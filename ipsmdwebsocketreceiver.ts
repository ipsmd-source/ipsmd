import Fastify, { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import crypto from 'crypto';

// Инициализируем наш сервер-замок
const server: FastifyInstance = Fastify({ logger: false });

// Регистрируем плагин WebSockets для мгновенного обмена игровыми пакетами без задержек (120 Гц)
server.register(fastifyWebsocket);

// Симуляция записи в нашей базе данных из Шага 2.1 (Для теста верификации)
// Храним только SHA-256 хэш формулы: Зеленый(#00FFCC) -> Красный(#FF0055) -> Синий(#7700FF)
// Для чистоты эксперимента жестко зашьем соль и хэш, которые сгенерировались на Шаге 2.1
const TEST_SALT = 'e3b0c44298fc1c149afbf4c8996fb924';
const EXPECTED_HASH = crypto
  .createHash('sha256')
  .update('#00ffcc|#ff0055|#7700ff.' + TEST_SALT)
  .digest('hex');

// Интерфейс для пакета трафика, который маскируется под игру (из Шага 1.4)
interface GameNetworkPacket {
  event: string;
  flowerPositionX: number;
  currentScore: number;
  encryptedPayload: string; // Замаскированный крипто-слой (base64)
}

// Служебная функция сборки хэша для сверки (как в Шаге 2.1)
function verifyColorSequence(colors: string[], salt: string): string {
  const rawString = colors.map(c => c.toLowerCase()).join('|') + '.' + salt;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}

// Регистрируем WebSocket-маршрут авторизации ipsmd
server.register(async (fastify) => {
  fastify.get('/api/security/game-stream', { websocket: true }, (connection, req) => {
    
    // Временный бункер памяти внутри текущего соединения для накопления собранных данных
    const collectedColors: string[] = [];
    const collectedTimeDeltas: number[] = [];
    let currentStep = 0;

    console.log('📡 [ipsmd-Замок] Установлено скрытое WebSocket-соединение с устройством клиента.');

    // Слушаем входящие пакеты от игры с Цветком-Радугой
    connection.socket.on('message', (message: string) => {
      try {
        // Парсим входящий "игровой" пакет данных
        const packet: GameNetworkPacket = JSON.parse(message.toString());

        // Хакер видит это и думает, что пользователь просто играет:
        console.log(`[Сетевой перехват] Пакет: "${packet.event}" | Координата X: ${packet.flowerPositionX} | Счет: ${packet.currentScore}`);

        // Если прилетел пакет об ошибке из игры — обрываем линию
        if (packet.event === 'game_over_trigger') {
          console.log('✕ [ipsmd-Замок] Игра завершена с ошибкой на клиенте. Сброс сессии.');
          connection.socket.send(JSON.stringify({ status: 'AUTH_FAILED', reason: 'GAME_OVER' }));
          connection.socket.close();
          return;
        }

        // РАБОТАЕМ С СКРЫТЫМ СЛОЕМ (Декодируем стеганографию)
        if (packet.event === 'flower_catch_success' && packet.encryptedPayload) {
          // Разрезаем base64 строку обратно в читаемый текст
          const decryptedRaw = Buffer.from(packet.encryptedPayload, 'base64').toString('utf-8');
          // Формат строки: "hex:#00FFCC|ms:1240|step:1"
          
          // Вытаскиваем HEX-код цвета и миллисекунды задержки пальцев
          const colorMatch = decryptedRaw.match(/hex:(#[0-9A-FA-F]{6})/);
          const msMatch = decryptedRaw.match(/ms:(\hd+)/);
          const stepMatch = decryptedRaw.match(/step:(\d+)/);

          if (colorMatch && msMatch && stepMatch) {
            const caughtColor = colorMatch[1];
            const timeDelta = parseInt(msMatch[1], 10);
            const packetStep = parseInt(stepMatch[1], 10);

            // Защита от дурака: Проверяем синхронность шагов фронта и бэка
            if (packetStep !== currentStep + 1) {
              connection.socket.send(JSON.stringify({ status: 'AUTH_FAILED', reason: 'DESYNC' }));
              connection.socket.close();
              return;
            }

            // Добавляем извлеченные данные в регистры текущей сессии
            collectedColors.push(caughtColor);
            collectedTimeDeltas.push(timeDelta);
            currentStep = packetStep;

            console.log(` -> [Скрытый декодер ipsmd] Извлечен цвет: ${caughtColor} | Задержка ввода: ${timeDelta}мс`);

            // ФИНАЛЬНЫЙ ЭТАП: Если пойманы все 3 капсулы, запускаем проверку ключа
            if (currentStep === 3) {
              console.log('⚙️ [ipsmd-Замок] Все 3 капли собраны. Запускаю криптографическую сверку...');

              // Пропускаем собранную из трафика последовательность через SHA-256 с солью из базы
              const finalCalculatedHash = verifyColorSequence(collectedColors, TEST_SALT);

              if (finalCalculatedHash === EXPECTED_HASH) {
                // ПОЛНЫЙ УСПЕХ! Ключи совпали!
                // Высчитываем средний клавиатурный почерк пользователя (для нашей "Энигмы" на Шаге 3.3)
                const averageEntropy = Math.round(collectedTimeDeltas.reduce((a, b) => a + b, 0) / 3);

                console.log(`✓ [ipsmd-Замок] АВТОРИЗАЦИЯ УСПЕШНА! Хэши совпали. Энтропия почерка: ${averageEntropy}мс`);

                // Отправляем скрытое игровое подтверждение "хэндшейка" обратно на клиент
                connection.socket.send(JSON.stringify({ 
                  status: 'AUTH_SUCCESS', 
                  message: 'Очки синхронизированы', // Маскировочный текст ответа
                  entropyToken: crypto.createHash('md5').update(averageEntropy.toString()).digest('hex') // Передаем базу для Энигмы
                }));
              } else {
                // ОШИБКА: Хэши не совпали (хакер пытался подменить payload)
                console.log('✕ [ipsmd-Замок] ХЭШИ НЕ СОВПАЛИ! Попытка несанкционированного входа.');
                connection.socket.send(JSON.stringify({ status: 'AUTH_FAILED', reason: 'BAD_KEY_HASH' }));
              }
              
              // Закрываем сокет, сессия верификации окончена
              connection.socket.close();
            }
          }
        }
      } catch (err) {
        console.error('✕ Ошибка разбора пакета трафика:', err);
        connection.socket.close();
      }
    });

    connection.socket.on('close', () => {
      console.log('📡 [ipsmd-Замок] WebSocket линия закрыта. Оперативные регистры очищены.');
    });
  });
});

// Запускаем сервер на порту 5000 (расширяем плату из Шага 2.1)
const start = async () => {
  try {
    await server.listen({ port: 5000, host: '0.0.0.0' });
    console.log('⚡ [ipsmd-Замок] WebSocket приемник маскированного трафика запущен на порту 5000!');
  } catch (err) {
    process.exit(1);
  }
};
start();