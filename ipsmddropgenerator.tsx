import React, { useEffect, useRef, useState } from 'react';

// Структура данных для летящей Капли Росы
interface Dewdrop {
  id: number;
  x: number;
  y: number;
  speedY: number;
  radius: number;
  color: string;
}

export default function IpsmdDropGenerator() {
  // Симуляция выбранных при регистрации 3 секретных цветов пользователя (из Шага 1.1)
  // Для примера возьмем Малиновый, Мятный и Фиолетовый
  const mySecretColors = ['#FF0055', '#00FFCC', '#7700FF'];
  
  // Общий пул цветов, которые могут появляться на экране для маскировки (наша радуга)
  const rainbowPool = ['#FF0055', '#00FFCC', '#7700FF', '#FFFF00', '#FF9900', '#0099FF', '#FF00FF'];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [flowerX, setFlowerX] = useState<number>(0);
  const dewdropsRef = useRef<Dewdrop[]>([]);
  const dropIdCounter = useRef<number>(0);

  // Хранитель цвета ПОСЛЕДНЕЙ сгенерированной капли (наш триггер-предохранитель)
  // Он нужен, чтобы реализовать твое правило: цвета никогда не дублируются подряд!
  const lastGeneratedColorRef = useRef<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

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

    // ===================================================
    // УМНЫЙ АЛГОРИТМ ГЕНЕРАЦИИ ЦВЕТОВ (БЕЗ ДУБЛИРОВАНИЯ)
    // ===================================================
    const getNextSecureColor = (): string => {
      let selectedColor = '';
      
      // Запускаем цикл подбора, который будет крутиться до тех пор, 
      // пока не выберет цвет, ОТЛИЧНЫЙ от предыдущего кадра
      while (true) {
        // С вероятностью 60% подбрасываем на экран один из секретных цветов пользователя,
        // чтобы ему не приходилось ждать свое яйцо/каплю весь день
        if (Math.random() < 0.6) {
          selectedColor = mySecretColors[Math.floor(Math.random() * mySecretColors.length)];
        } else {
          // С вероятностью 40% берем случайный цвет из общей палитры для шума и маскировки
          selectedColor = rainbowPool[Math.floor(Math.random() * rainbowPool.length)];
        }

        // ЖЕСТКАЯ ПРОВЕРКА (Твое правило): Если выбранный цвет СОВПАДАЕТ с цветом 
        // предыдущей капли — бракуем его и уходим на следующий круг цикла!
        if (selectedColor !== lastGeneratedColorRef.current) {
          break; // Цвет уникален, предохранитель пропущен, выходим из цикла
        }
      }

      // Запоминаем этот цвет в регистр памяти как "последний сгенерированный" для следующего шага
      lastGeneratedColorRef.current = selectedColor;
      return selectedColor;
    };

    // Основной цикл анимации (120 Гц через видеопамять)
    const updatePhysicsAndRender = () => {
      if (!canvas || !ctx) return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Глубокий ночной фон ipsmd
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Генерация капель с учетом нашего умного алгоритма чередования
      if (Math.random() < 0.025 && dewdropsRef.current.length < 6) {
        dropIdCounter.current += 1;
        
        // Получаем очищенный от дубликатов цвет из нашего алгоритма
        const secureColor = getNextSecureColor();

        dewdropsRef.current.push({
          id: dropIdCounter.current,
          x: Math.random() * (width - 60) + 30, // Равномерное распределение по лоткам
          y: -15,
          speedY: Math.random() * 1.2 + 1.8,    // Комфортная скорость для человеческого глаза
          radius: 9,
          color: secureColor
        });
      }

      // Расчет полета капель
      dewdropsRef.current = dewdropsRef.current.filter((drop) => {
        drop.y += drop.speedY;

        // Рендеринг сочной неоновой капли с эффектом свечения в VRAM
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

      // Отрисовка Цветка-Радуги ipsmd
      const flowerY = height - 50;
      ctx.save();
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#00ffcc';

      // Гибкий стебель (Кривая Безье)
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
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      // Сердечник
      const gradient = ctx.createRadialGradient(flowerX, flowerY, 2, flowerX, flowerY, 18);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, '#00ffcc');
      gradient.addColorStop(1, '#7700FF');
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
  }, [flowerX]);

  // Адаптивное управление пальцем и мышкой
  const updateFlowerPosition = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let relativeX = clientX - rect.left;
    if (relativeX < 35) relativeX = 35;
    if (relativeX > rect.width - 35) relativeX = rect.width - 35;
    setFlowerX(relativeX);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-white font-sans select-none">
      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl flex flex-col items-center">
        
        {/* Информационная панель */}
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <div>
            <h2 className="text-lg font-bold tracking-wider text-emerald-400">Генератор ipsmd</h2>
            <p className="text-[10px] text-slate-400">Шаг 1.3: Потоковый алгоритм чередования капель</p>
          </div>
          <span className="text-[11px] font-mono bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-300">
            Anti-Duplicate Active
          </span>
        </div>

        {/* Индикатор секретного кода пользователя для наглядности при тестировании платы */}
        <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 mb-4 flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 block">Твоя секретная формула для теста:</span>
          <div className="flex gap-4">
            {mySecretColors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                <span className="text-xs font-mono text-slate-300">Капля {i+1} ({color})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Игровое поле Canvas */}
        <div 
          ref={containerRef}
          onMouseMove={(e) => updateFlowerPosition(e.clientX)}
          onTouchMove={(e) => e.touches.length > 0 && updateFlowerPosition(e.touches[0].clientX)}
          className="relative w-full h-96 rounded-2xl overflow-hidden border border-white/5 bg-slate-900 cursor-none"
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
        </div>

        <div className="w-full mt-4 bg-black/20 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-[11px] text-slate-400">
            Капли генерируются по закону распределения вероятностей. Повторение двух одинаковых цветов подряд аппаратно заблокировано.
          </p>
        </div>

      </div>
    </div>
  );
}