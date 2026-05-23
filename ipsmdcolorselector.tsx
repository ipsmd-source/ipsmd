import React, { useState, useRef, useEffect } from 'react';

// Интерфейс для хранения выбранного цвета (HEX-код и имя для удобства инженера)
interface SelectedColor {
  hex: string;
  index: number;
}

export default function IpsmdColorSelector() {
  // Массив для хранения трех выбранных секретных цветов (наша будущая формула шифра)
  const [secretColors, setSecretColors] = useState<SelectedColor[]>([]);
  
  // Текущий цвет, на который пользователь навел курсор или палец в данный момент
  const [hoveredColor, setHoveredColor] = useState<string>('#00ffcc');
  
  // Состояние, зажата ли мышка/палец на цветовом круге (для плавного перетаскивания)
  const [isTracking, setIsTracking] = useState<boolean>(false);

  // Ссылки на элементы для вычисления физических координат клика (как в схемотехнике)
  const wheelRef = useRef<HTMLDivElement>(null);

  // Функция, которая переводит декартовы координаты (X, Y) экрана в полярные (угол и радиус)
  // Это нужно, чтобы точно определить, в какую точку цветового круга ткнул пользователь
  const handleColorSelection = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return;

    // Получаем физические границы и центр нашего кругового элемента на экране
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Вычисляем вектор (смещение) от центра круга до точки касания пальцем/мышкой
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Вычисляем угол в градусах (от 0 до 360) с помощью тригонометрического арктангенса
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360; // Избавляемся от отрицательных углов

    // Вычисляем расстояние от центра до точки клика (радиус)
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;

    // Если кликнули слишком далеко за пределами круга — игнорируем запрос
    if (distance > maxRadius) return;

    // Превращаем угол в значение оттенка (Hue) для цветовой модели HSL (от 0 до 360)
    const hue = Math.round(angle);
    // Вычисляем насыщенность (Saturation) в зависимости от удаления от центра (от 0% до 100%)
    const saturation = Math.round((distance / maxRadius) * 100);
    // Яркость (Lightness) держим на уровне 50% для сочности неонового спектра радуги
    const lightness = 50;

    // Переводим HSL в стандартный HEX-формат интернета, который понимает сервер
    const hex = hslToHex(hue, saturation, lightness);
    setHoveredColor(hex);

    return hex;
  };

  // Слушатели событий для поддержки тач-экранов телефонов и мышек компьютеров (полная адаптивность)
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsTracking(true);
    const pageX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pageY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    handleColorSelection(pageX, pageY);
  };

  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isTracking) return;
    const pageX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pageY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    handleColorSelection(pageX, pageY);
  };

  const handleEnd = (e: MouseEvent | TouchEvent) => {
    if (!isTracking) return;
    setIsTracking(false);
    
    // В момент отпускания пальца/мышки фиксируем выбранный цвет в нашу секретную формулу
    const pageX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
    const pageY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
    const finalHex = handleColorSelection(pageX, pageY);

    if (finalHex && secretColors.length < 3) {
      // Добавляем цвет в массив, пока их не станет ровно 3 штуки
      setSecretColors([...secretColors, { hex: finalHex, index: secretColors.length + 1 }]);
    }
  };

  // Глобальные слушатели перемещения (чтобы палец не срывался при выходе за границы круга)
  useEffect(() => {
    if (isTracking) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isTracking, secretColors]);

  // Сброс выбранной формулы цветов, если пользователь решил переделать всё заново
  const resetColors = () => setSecretColors([]);

  // Вспомогательный чистый алгоритм перевода HSL модели в HEX строку (чистая математика процессора)
  function hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-white select-none font-sans">
      
      {/* Контейнер-карточка с эффектом матового стекла (Glassmorphism 2026 года) */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col items-center">
        
        {/* Шапка под бренд ipsmd */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-wider text-emerald-400">ipsmd SECURE</h1>
          <p className="text-xs text-slate-400 mt-1">Шаг 1.1: Создание цветового ключа Цветка-Радуги</p>
        </div>

        {/* Индикатор текущего наведенного оттенка (светящаяся неоновая капля) */}
        <div className="flex items-center gap-3 mb-6 bg-black/30 px-4 py-2 rounded-full border border-white/5 shadow-inner">
          <div 
            className="w-5 h-5 rounded-full transition-all duration-75 shadow-lg" 
            style={{ backgroundColor: hoveredColor, boxShadow: `0 0 15px ${hoveredColor}` }}
          />
          <span className="text-sm font-mono tracking-widest text-slate-200">{hoveredColor}</span>
        </div>

        {/* 3D Интерактивный круговой селектор */}
        <div 
          ref={wheelRef}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          className="relative w-72 h-72 rounded-full cursor-crosshair shadow-[0_0_40px_rgba(0,0,0,0.7)] border-4 border-slate-900 active:scale-[0.99] transition-transform duration-100"
          style={{
            // Создаем непрерывный плавный градиент всех спектров радуги (от 0 до 360 градусов)
            background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          }}
        >
          {/* Скрытый внутренний слой затеняющий центр круга для создания эффекта объема (3D сферы) */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent via-black/10 to-black/40 pointer-events-none" />
          
          {/* Центральный матовый островок, превращающий круг в стильное кольцо */}
          <div className="absolute inset-[30%] bg-slate-950 rounded-full border border-white/10 shadow-2xl flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-slate-700 font-mono">{secretColors.length}/3</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Капли</span>
          </div>
        </div>

        {/* Блок отображения 3 выбранных лепестков-цветов (наша секретная формула) */}
        <div className="w-full grid grid-cols-3 gap-3 mt-8">
          {[0, 1, 2].map((slotIndex) => {
            const saved = secretColors[slotIndex];
            return (
              <div 
                key={slotIndex} 
                className="h-16 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300"
                style={saved ? { border: `1px solid ${saved.hex}44`, boxShadow: `0 0 15px ${saved.hex}22` } : {}}
              >
                {saved ? (
                  <>
                    {/* Если слот заполнен — плавно заливаем его выбранным неоновым цветом */}
                    <div className="absolute inset-0 opacity-25" style={{ backgroundColor: saved.hex }} />
                    <span className="text-[10px] text-slate-400 font-mono z-10">Лепесток {saved.index}</span>
                    <span className="text-xs font-bold font-mono tracking-tight z-10" style={{ color: saved.hex }}>{saved.hex}</span>
                  </>
                ) : (
                  // Пустой слот в режиме ожидания клика пользователя
                  <span className="text-xs text-slate-600 italic">Ожидание...</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Кнопка сброса платы ввода, если ошиблись */}
        {secretColors.length > 0 && (
          <button
            onClick={resetColors}
            className="mt-6 text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium tracking-wider uppercase px-4 py-2 rounded-full hover:bg-rose-500/10 active:scale-95 duration-100"
          >
            Сбросить конфигурацию
          </button>
        )}

      </div>
    </div>
  );
}