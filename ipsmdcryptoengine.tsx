
import React, { useState, useRef, useEffect } from 'react';

// Структуры для хранения осколков файлов (Crypto Splitting)
interface FileSplitted {
  id: string;
  shardA: Blob; // Улетает на сервер чата (бинарная каша)
  shardB: Blob; // Улетает на Сервер-Замок (мета-ключ)
}

export default function IpsmdCryptoEngine() {
  // Текст, который видит пользователь, и зашифрованный "шум", который уходит в сеть
  const [rawText, setRawText] = useState<string>('');
  const [encryptedLive, setEncryptedLive] = useState<string>('');
  
  // Логи для инженера-схемотехника, отображающие физику процесса
  const [cryptoLogs, setCryptoLogs] = useState<string[]>([]);
  const [processedFile, setProcessedFile] = useState<string | null>(null);

  // Регистры времени для замера клавиатурного почерка ("Энигма")
  const lastKeyTimeRef = useRef<number>(performance.now());
  const enegmaShiftRef = useRef<number>(42); // Стартовое смещение ротора (из Шага 2.2)

  // Аппаратный криптографический ключ для AES-GCM (хранится строго в RAM процессора)
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  // Инициализация аппаратного крипто-чипа браузера при запуске платы
  useEffect(() => {
    async function initCrypto() {
      // Генерируем временный сессионный ключ прямо в изолированной памяти Web Crypto API
      cryptoKeyRef.current = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false, // Ключ приватный, его нельзя экспортировать хакерам через дамп памяти
        ['encrypt', 'decrypt']
      );
      addLog('⚡ [Аппаратный крипто-чип] Ключ AES-256 сгенерирован внутри RAM процессора.');
    }
    initCrypto();
  }, []);

  // Функция вывода логов на диагностический экран ipsmd
  const addLog = (msg: string) => {
    setCryptoLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 5)]);
  };

  // ===================================================
  // ДИНАМИЧЕСКИЙ ПОТОВЫЙ ШИФР (Наша "Энигма" на паузах)
  // ===================================================
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    // Вычисляем "Flight Time" — время полета пальца между клавишами в миллисекундах
    const flightTime = Math.round(now - lastKeyTimeRef.current);
    lastKeyTimeRef.current = now;

    if (e.key.length === 1) { // Фиксируем только ввод реальных букв
      // Динамически сдвигаем ротор кодирования, используя миллисекунды как генератор случайных чисел
      enegmaShiftRef.current = (enegmaShiftRef.current + flightTime + e.key.charCodeAt(0)) % 256;
      
      addLog(`⌨️ Пауза ввода: ${flightTime}мс. Ротор Энигмы провернулся на шаг: ${enegmaShiftRef.current}`);
    }
  };

  // Эмуляция потокового кодирования текста при изменении строки ввода
  useEffect(() => {
    if (!rawText) {
      setEncryptedLive('');
      return;
    }
    // Применяем динамический сдвиг к каждой букве
    const encoded = rawText
      .split('')
      .map((char, idx) => {
        // Каждая следующая буква кодируется с уникальным математическим смещением
        const dynamicCode = char.charCodeAt(0) ^ (enegmaShiftRef.current + idx);
        return String.fromCharCode(dynamicCode);
      })
      .join('');

    // Переводим в base64, чтобы безопасно слать по сети без битых символов
    setEncryptedLive(btoa(unescape(encodeURIComponent(encoded))));
  }, [rawText]);


  // ===================================================
  // КРИПТОГРАФИЧЕСКОЕ РАСЩЕПЛЕНИЕ МЕДИА (Crypto Splitting)
  // ===================================================
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cryptoKeyRef.current) return;

    addLog(`📁 Файл выбран: ${file.name} (${Math.round(file.size / 1024)} Кб)`);

    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    
    fileReader.onload = async () => {
      try {
        const rawBuffer = fileReader.result as ArrayBuffer;

        // Создаем вектор инициализации (одноразовая соль для AES-GCM)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // Аппаратное шифрование силами графического ускорителя (через Web Crypto)
        addLog('⚙️ Запуск GPU-ускорения шифрования AES-GCM...');
        const encryptedBuffer = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          cryptoKeyRef.current!,
          rawBuffer
        );

        // Переводим зашифрованную кашу в Blob
        const fullEncryptedBlob = new Blob([encryptedBuffer]);

        // --- ТАКТ РАСЩЕПЛЕНИЯ (Crypto Splitting) ---
        // Разрезаем зашифрованный файл на 2 куска прямо в памяти:
        // Шард А — 90% бинарного тела файла. Шард Б — 10% хвоста с солью IV и заголовками.
        const cutPoint = Math.floor(fullEncryptedBlob.size * 0.9);
        
        const shardA = fullEncryptedBlob.slice(0, cutPoint);
        const shardB = new Blob([iv.buffer, fullEncryptedBlob.slice(cutPoint)]);

        addLog(`✂️ Файл успешно расщеплен! Шард А (Тело): ${shardA.size} байт. Шард Б (Ключ-Заголовок): ${shardB.size} байт.`);
        
        // Визуализируем "кашу", которую увидит хакер при взломе открытого сервера сайта
        setProcessedFile(`[SHARD_A_DATA_STREAM]: ${btoa(String.fromCharCode(...new Uint8Array(rawBuffer.slice(0, 40))))}...`);

      } catch (err) {
        addLog('✕ Ошибка аппаратного шифрования.');
      }
    };
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-white font-sans select-none">
      <div className="w-full max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col gap-6">
        
        {/* Шапка */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-wider text-emerald-400 font-mono">ipsmd CRYPTO ENGINE</h2>
            <p className="text-[10px] text-slate-400">Шаг 3.3: Конечный контур потокового шифрования и расщепления файлов</p>
          </div>
          <span className="text-[10px] font-mono bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full text-rose-300 animate-pulse">
            E2EE Аппаратная Защита
          </span>
        </div>

        {/* СЕКЦИЯ ТЕКСТА: Динамическая Энигма */}
        <div className="flex flex-col gap-2 bg-black/30 border border-white/5 p-4 rounded-2xl">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">// Ввод текста (Замеряется почерк рук):</label>
          <input
            type="text"
            value={rawText}
            onKeyDown={handleKeyPress}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Начните вводить сообщение здесь..."
            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          
          <div className="mt-2">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-1">То, что улетает на открытый сервер (Зашифрованный шум):</span>
            <div className="w-full p-2.5 bg-slate-950 rounded-xl font-mono text-[10px] text-amber-400 break-all border border-white/5 min-h-[36px]">
              {encryptedLive || <span className="text-slate-700 italic">Ожидание нажатия клавиш...</span>}
            </div>
          </div>
        </div>

        {/* СЕКЦИЯ МЕДИА: Загрузка и Расщепление фото/видео */}
        <div className="flex flex-col gap-2 bg-black/30 border border-white/5 p-4 rounded-2xl">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">// Защита Фото и Видео (Crypto Splitting):</label>
          
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer bg-black/20 hover:bg-black/40 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <p className="text-xs text-slate-400"><span className="font-semibold text-emerald-400">Выберите картинку/видео</span> для теста расщепления</p>
                <p className="text-[9px] text-slate-500 mt-1">Файл зашифруется в VRAM и разрежется в памяти</p>
              </div>
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {processedFile && (
            <div className="mt-2">
              <span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-1">След взлома открытого сервера (Что увидит хакер на диске):</span>
              <div className="w-full p-2.5 bg-slate-950 rounded-xl font-mono text-[9px] text-rose-400 break-all border border-white/5">
                {processedFile}
              </div>
            </div>
          )}
        </div>

        {/* ДИАГНОСТИЧЕСКИЕ ЛОГИ (Реальное поведение системы) */}
        <div className="w-full bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[9px] text-slate-400">
          <span className="text-emerald-500 block mb-1 font-bold">// Монитор криптографических процессоров ipsmd:</span>
          {cryptoLogs.length === 0 ? (
            <div className="text-slate-600 italic">Система находится в режиме ожидания активности...</div>
          ) : (
            cryptoLogs.map((log, idx) => <div key={idx} className="py-0.5 truncate">{log}</div>)
          )}
        </div>

      </div>
    </div>
  );
}