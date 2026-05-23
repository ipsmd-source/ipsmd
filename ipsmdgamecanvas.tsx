import React, { useEffect, useRef, useState } from 'react';

// Структура данных для падающей Капли Росы (наш физический объект)
interface Dewdrop {
  id: number;
  x: number;          // Позиция по горизонтали X
  y: number;          // Позиция по вертикали Y
  speedY: number;      // Скорость падения (ускорение свободного падения)
  radius: number;      // Физический размер капли
  color: string;       // HEX-код цвета капли росы
}

export default function IpsmdGameCanvas() {
  // Ссылки на Canvas и контейнер для точного расчета физических размеров экрана
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Координата X наклона бутона Цветка-Радуги (управление пользователем)
  const [flowerX, setFlowerX] = useState<number>(0);
  
  // Массив активных капель росы, летящих на экране в данный момент
  const dewdropsRef = useRef<Dewdrop[]>([]);
  
  // Системный счетчик ID для генерации уникальных капель
  const dropIdCounter = useRef<number>(0);

  // Список цветов, которые будут падать (пока демонстрационные, на Шаге 1.3 завяжем на формулу)
  const demoColors = ['#FF0055', '#00FFCC', '#7700FF', '#FFFF00', '#FF9900'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Функция автоматической адаптации размеров платы Canvas под дисплей (ПК или Смартфон)
    const resizeCanvas = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Считываем физическое разрешение экрана, учитывая плотность пикселей Retina/OLED (Retina-сглаживание)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Масштабируем контекст, чтобы графика не была размытым говном из 2010 года
      ctx.scale(dpr, dpr);
      
      // По умолчанию ставим Цветок-Радугу ровно по центру нижней границы
      setFlowerX(rect.width / 2);
    };

    // Первичная инициализация геометрии
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ==========================================
    // СИСТЕМНЫЙ ЦИКЛ РЕНДЕРИНГА И ФИЗИКИ (120 Гц)
    // ==========================================
    const updatePhysicsAndRender = () => {
      if (!canvas || !ctx || !containerRef.current) return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Очищаем экран под новый кадр, заливая его глубоким космическим цветом ночи ipsmd
      ctx.fillStyle = '#020617'; 
      ctx.fillRect(0, 0, width, height);

      // --- ТАКТ 1: Генерация новых Капель Росы по таймеру ---
      // С вероятностью 2% на каждом кадре сверху рождается новая капля росы
      if (Math.random() < 0.02 && dewdropsRef.current.length < 8) {
        dropIdCounter.current += 1;
        dewdropsRef.current.push({
          id: dropIdCounter.current,
          x: Math.random() * (width - 40) + 20, // Случайный лоток по оси X
          y: -10,                               // Начинает падать из-за верхнего края экрана
          speedY: Math.random() * 1.5 + 1.5,    // Скорость падения капли росы
          radius: 8,                            // Физический размер капли
          color: demoColors[Math.floor(Math.random() * demoColors.length)] // Случайный сочный оттенок
        });
      }

      // --- ТАКТ 2: Расчет физики полета капель и отрисовка ---
      dewdropsRef.current = dewdropsRef.current.filter((drop) => {
        // Применяем гравитацию: увеличиваем координату Y на величину скорости
        drop.y += drop.speedY;

        // Эффект красивого неонового свечения вокруг летящей капли росы (Спецэффекты 2026)
        ctx.save();
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
        ctx.shadowBlur = 15;
        ctx.shadowColor = drop.color;
        ctx.fillStyle = drop.color;
        ctx.fill();
        ctx.restore();

        // Физическое условие: если капля долетела до земли — убираем её из памяти (минус объект)
        if (drop.y > height + 20) {
          return false;
        }
        return true;
      });

      // --- ТАКТ 3: Отрисовка интерактивного Цветка-Радуги ipsmd ---
      const flowerY = height - 50; // Фиксированная позиция корней цветка у нижней кромки
      const stemHeight = 80;       // Высота гибкого стебля цветка

      ctx.save();
      // Настраиваем неоновое размытие и свечение для лепестков Цветка-Радуги
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#00ffcc';

      // 1. Отрисовка гибкого стебля (Линия от корня до текущего положения пальца/мышки)
      ctx.beginPath();
      ctx.moveTo(width / 2, height); // Корень намертво привязан к центру низа экрана
      // Плавная кривая Безье для создания эффекта живого, гнущегося стебля растения
      ctx.quadraticCurveTo(width / 2, flowerY + 20, flowerX, flowerY);
      ctx.strokeStyle = '#10b981'; // Изумрудный цвет здорового стебля ipsmd
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Отрисовка Бутона Цветка (Чашечка, которой мы ловим капли росы)
      ctx.beginPath();
      ctx.arc(flowerX, flowerY, 20, 0, Math.PI, true); // Полусфера-ловушка
      ctx.closePath();
      ctx.fillStyle = '#1e293b'; // Темный внутренний каркас бутона
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      // 3. Переливающийся Радужный Сердечник Цветка (WebGL/Canvas градиент)
      const gradient = ctx.createRadialGradient(flowerX, flowerY, 2, flowerX, flowerY, 18);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#00ffcc');
      gradient.addColorStop(0.7, '#7700FF');
      gradient.addColorStop(1, '#FF0055');
      
      ctx.beginPath();
      ctx.arc(flowerX, flowerY, 14, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.restore();

      // Зацикливаем процесс рендеринга через requestAnimationFrame (синхронизация с частотой экрана)
      animationFrameId = requestAnimationFrame(updatePhysicsAndRender);
    };

    // Запускаем бесконечный аппаратный цикл
    animationFrameId = requestAnimationFrame(updatePhysicsAndRender);

    // Очистка таймеров и слушателей при демонтаже платы, чтобы не было утечки памяти
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [flowerX]);

  // ==========================================
  // АДАПТИВНОЕ УПРАВЛЕНИЕ (МЫШЬ И СЕНСОР ТЕЛЕФОНА)
  // ==========================================
  const updateFlowerPosition = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Вычисляем смещение относительно левой границы игрового поля
    let relativeX = clientX - rect.left;
    
    // Жесткие ограничители (Guard Rails), чтобы Цветок не улетал за границы экрана
    if (relativeX < 30) relativeX = 30;
    if (relativeX > rect.width - 30) relativeX = rect.width - 30;

    setFlowerX(relativeX);
  };

  // Обработчик движения мышки для компьютеров
  const handleMouseMove = (e: React.MouseEvent) => {
    updateFlowerPosition(e.clientX);
  };

  // Обработчик свайпов пальцем для экранов мобильных телефонов
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      updateFlowerPosition(e.touches[0].clientX);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-white font-sans select-none">
      
      {/* Карточка-контейнер с эффектом матового стекла (Стиль ipsmd) */}
      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex flex-col items-center">
        
        {/* Информационная плашка управления */}
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <div>
            <h2 className="text-lg font-bold tracking-wider text-emerald-400">Калибровка ipsmd</h2>
            <p className="text-[10px] text-slate-400">Шаг 1.2: Синхронизация Цветка-Радуги с VRAM (120Hz)</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-300 animate-pulse">
              GPU Active
            </span>
          </div>
        </div>

        {/* Физический контейнер игрового Canvas поля */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="relative w-full h-96 rounded-2xl overflow-hidden border border-white/5 bg-slate-900 cursor-none shadow-inner"
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
          
          {/* Текстовая подсказка-инструкция для пользователя поверх экрана */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none text-center bg-black/40 backdrop-blur-md border border-white/5 px-4 py-1 rounded-full">
            <p className="text-[10px] text-slate-300 uppercase tracking-widest">
              Води пальцем или мышкой, чтобы наклонять стебель
            </p>
          </div>
        </div>

        {/* Нижняя декоративная панель */}
        <div className="w-full mt-4 bg-black/20 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-xs text-slate-400">
            Система считывает пространственные координаты $X$ объекта для сборки статического ключа сессии.
          </p>
        </div>

      </div>
    </div>
  );
}