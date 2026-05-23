import React, { useEffect, useRef, useState } from 'react';

// Структура данных для падающей Капли Росы
interface Dewdrop {
  id: number;
  x: number;
  y: number;
  speedY: number;
  radius: number;
  color: string;
}

// Структура для пакета маскированного шпионского трафика (Стеганография)
interface GameNetworkPacket {
  event: string;        // Для маскировки пишем "flower_move" или "score_update"
  flowerPositionX: number; // Координата цветка в момент поимки
  currentScore: number;  // Игровой счет (для отвода глаз)
  encryptedPayload: string; // Тут прячутся наши миллисекунды и HEX-коды!
}

export default function IpsmdSecureVerifier() {
  // Твоя секретная формула, выбранная при регистрации (Зеленый -> Красный -> Синий)
  const mySecretSequence = ['#00FFCC', '#FF0055', '#7700FF'];
  const rainbowPool = ['#FF0055', '#00FFCC', '#7700FF', '#FFFF00', '#FF9900', '#0099FF'];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [flowerX, setFlowerX] = useState<number>(0);
  const [verificationStep, setVerificationStep] = useState<number>(0); // Текущий шаг проверки (0 из 3)
  const [gameStatus, setGameStatus] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
  
  const dewdropsRef = useRef<Dewdrop[]>([]);
  const dropIdCounter = useRef<number>(0);
  const lastGeneratedColorRef = useRef<string>('');

  // ТАЙМЕРЫ ЭНТРОПИИ: Хранят время предыдущего успешного действия для замера пауз в мс
  const lastCatchTimestampRef = useRef<number>(0);
  // Массив пакетов, который мы накопим за игру и отправим на Сервер-Замок
  const [networkLogs, setNetworkLogs] = useState<GameNetworkPacket[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    lastCatchTimestampRef.current = performance.now(); // Стартуем замер времени при запуске платы

    const resizeCanvas = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      setFlowerX(rect.width / 2);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Умный генератор капель (Шаг 1.3)
    const getNextSecureColor = (): string => {
      let selectedColor = '';
      while (true) {
        if (Math.random() < 0.6) {
          selectedColor = mySecretSequence[Math.floor(Math.random() * mySecretSequence.length)];
        } else {
          selectedColor = rainbowPool[Math.floor(Math.random() * rainbowPool.length)];
        }
        if (selectedColor !== lastGeneratedColorRef.current) break;
      }
      lastGeneratedColorRef.current = selectedColor;
      return selectedColor;
    };

    // ==========================================
    // СИСТЕМНЫЙ ЦИКЛ АНИМАЦИИ, ФИЗИКИ И ВЕРИФИКАЦИИ
    // ==========================================
    const updatePhysicsAndRender = () => {
      if (!canvas || !ctx || gameStatus !== 'PLAYING') return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Спавн капель
      if (Math.random() < 0.03 && dewdropsRef.current.length < 5) {
        dropIdCounter.current += 1;
        dewdropsRef.current.push({
          id: dropIdCounter.current,
          x: Math.random() * (width - 60) + 30,
          y: -15,
          speedY: Math.random() * 1.5 + 2.0, // Чуть ускоряем темп для динамики
          radius: 9,
          color: getNextSecureColor()
        });
      }

      const flowerY = height - 50;
      const catchRadius = 24; // Зона физического контакта бутона с каплей

      // Расчет полета и коллизий
      dewdropsRef.current = dewdropsRef.current.filter((drop) => {
        drop.y += drop.speedY;

        // Физическое условие: Проверяем, попала ли капля внутрь бутона Цветка-Радуги
        const distanceToFlower = Math.sqrt(Math.pow(drop.x - flowerX, 2) + Math.pow(drop.y - flowerY, 2));

        if (distanceToFlower < catchRadius) {
          // --- МОМЕНТ КОНТАКТА: ЗАПУСКАЕМ КРИПТОГРАФИЧЕСКИЙ АНАЛИЗ ---
          const now = performance.now();
          const timeDelta = Math.round(now - lastCatchTimestampRef.current); // Пауза в мс между нажатиями
          lastCatchTimestampRef.current = now;

          // Проверяем, совпадает ли цвет пойманной капли со следующим цветом в нашей секретной формуле
          const targetRequiredColor = mySecretSequence[verificationStep];

          if (drop.color === targetRequiredColor) {
            // ШАГ ПРОЙДЕН УСПЕШНО!
            const nextStep = verificationStep + 1;
            
            // СТЕГАНОВРАФИЯ: Маскируем реальные данные под игровой сетевой трафик
            const fakePacket: GameNetworkPacket = {
              event: 'flower_catch_success',
              flowerPositionX: Math.round(flowerX),
              currentScore: nextStep * 100,
              // Зашифровываем HEX цвета и миллисекунды задержки в нечитаемую для хакеров строку
              encryptedPayload: btoa(`hex:${drop.color}|ms:${timeDelta}|step:${nextStep}`)
            };
            
            // Складываем пакет в лог отправки
            setNetworkLogs(prev => [...prev, fakePacket]);
            setVerificationStep(nextStep);

            // Если успешно поймали все 3 капли в нужном порядке — игра завершена, ждем хэндшейк
            if (nextStep === 3) {
              setGameStatus('SUCCESS');
            }
          } else {
            // ОШИБКА: Поймали не тот цвет или нарушили порядок!
            // Если поймали цвет, который вообще не является следующим секретным — сброс платы
            if (mySecretSequence.includes(drop.color) || Math.random() < 0.3) {
              const failPacket: GameNetworkPacket = {
                event: 'game_over_trigger',
                flowerPositionX: Math.round(flowerX),
                currentScore: 0,
                encryptedPayload: btoa(`ERR_BAD_ROUTE|ms:${timeDelta}`)
              };
              setNetworkLogs(prev => [...prev, failPacket]);
              setGameStatus('FAILED');
            }
          }
          return false; // Удаляем каплю из памяти, она поглощена цветком
        }

        // Рендеринг капли росы в VRAM
        ctx.save();
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
        ctx.shadowBlur = 20;
        ctx.shadowColor = drop.color;
        ctx.fillStyle = drop.color;
        ctx.fill();
        ctx.restore();

        return drop.y <= height + 20;
      });

      // Отрисовка Цветка-Радуги
      ctx.save();
      ctx.shadowBlur = 25;
      // Цвет свечения меняется в зависимости от успехов пользователя (обратная связь)
      ctx.shadowColor = verificationStep > 0 ? mySecretSequence[verificationStep - 1] : '#00ffcc';

      // Гибкий стебель
      ctx.beginPath();
      ctx.moveTo(width / 2, height);
      ctx.quadraticCurveTo(width / 2, flowerY + 20, flowerX, flowerY);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Ловушка-бутон Цветка
      ctx.beginPath();
      ctx.arc(flowerX, flowerY, 22, 0, Math.PI, true);
      ctx.closePath();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = verificationStep > 0 ? mySecretSequence[verificationStep - 1] : '#34d399';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      // Радужный динамический сердечник
      const gradient = ctx.createRadialGradient(flowerX, flowerY, 2, flowerX, flowerY, 18);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, mySecretSequence[verificationStep] || '#ffffff');
      gradient.addColorStop(1, '#1e293b');
      ctx.beginPath();
      ctx.arc(flowerX, flowerY, 15, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.restore();

      animationFrameId = requestAnimationFrame(updatePhysicsAndRender);
    };

    animationFrameId = requestAnimationFrame(updatePhysicsAndRender);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [flowerX, verificationStep, gameStatus]);

  // Перезапуск платы верификации для повторного теста
  const resetVerificationBoard = () => {
    dewdropsRef.current = [];
    setVerificationStep(0);
    setNetworkLogs([]);
    setGameStatus('PLAYING');
    lastCatchTimestampRef.current = performance.now();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-white font-sans select-none">
      <div className="w-full max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl flex flex-col items-center">
        
        {/* Шапка модуля */}
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <div>
            <h2 className="text-lg font-bold tracking-wider text-emerald-400">ipsmd VERIFIER</h2>
            <p className="text-[10px] text-slate-400">Шаг 1.4: Модуль контроля коллизий и стеганографии трафика</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-300">
              Шаг {verificationStep} из 3
            </span>
          </div>
        </div>

        {/* Индикатор твоей формулы */}
        <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 mb-4 text-center">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-2">
            Порядок сбора капель росы:
          </span>
          <div className="flex justify-center gap-6">
            {mySecretSequence.map((color, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 transition-all duration-300 ${i === verificationStep ? 'bg-white/10 scale-105 border-emerald-500/30' : 'opacity-40'}`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
                <span className="text-xs font-mono">Капля {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Игровой экран Canvas */}
        <div 
          ref={containerRef}
          onMouseMove={(e) => containerRef.current && setFlowerX(Math.max(35, Math.min(containerRef.current.getBoundingClientRect().width - 35, e.clientX - containerRef.current.getBoundingClientRect().left)))}
          onTouchMove={(e) => e.touches.length > 0 && containerRef.current && setFlowerX(Math.max(35, Math.min(containerRef.current.getBoundingClientRect().width - 35, e.touches.clientX - containerRef.current.getBoundingClientRect().left)))}
          className="relative w-full h-80 rounded-2xl overflow-hidden border border-white/5 bg-slate-900 cursor-none"
        >
          {gameStatus === 'PLAYING' ? (
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
          ) : (
            // Экраны результатов верификации
            <div className="absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              {gameStatus === 'SUCCESS' ? (
                <>
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center text-3xl font-bold mb-3 shadow-[0_0_30px_rgba(16,185,129,0.2)]">✓</div>
                  <h3 className="text-xl font-bold text-emerald-400 tracking-wide">Ключ сессии успешно собран!</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-2">
                    Сформировано 3 стеганографических пакета координат. Готово к передаче хэндшейка на Блок 2.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full flex items-center justify-center text-3xl font-bold mb-3 shadow-[0_0_30px_rgba(244,63,94,0.2)]">✕</div>
                  <h3 className="text-xl font-bold text-rose-400 tracking-wide">Ошибка верификации</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-2">
                    Нарушена целостность цветовой формулы или порядка ввода. Плата сброшена.
                  </p>
                </>
              )}
              <button 
                onClick={resetVerificationBoard}
                className="mt-6 text-xs font-mono tracking-wider uppercase bg-white/5 border border-white/10 px-5 py-2 rounded-full hover:bg-white/10 active:scale-95 transition-all"
              >
                Перезапустить модуль
              </button>
            </>
          )}
        </div>

        {/* Шпионский лог трафика (Для наглядности инженера, что летит в сеть) */}
        {networkLogs.length > 0 && (
          <div className="w-full mt-4 bg-black/50 border border-white/5 rounded-xl p-3 font-mono text-[9px] text-slate-400 max-h-24 overflow-y-auto">
            <span className="text-emerald-500 block mb-1">// Имитация пакетов трафика WebSockets для Сервера-Замка:</span>
            {networkLogs.map((packet, idx) => (
              <div key={idx} className="border-b border-white/5 py-1 last:border-0 truncate">
                {`[OutPacket-${idx}] event: "${packet.event}" | x: ${packet.flowerPositionX} | score: ${packet.currentScore} | payload: "${packet.encryptedPayload.slice(0, 35)}..."`}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}