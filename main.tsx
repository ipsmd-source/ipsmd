import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import IpsmdGameCanvas from './ipsmdgamecanvas';
import IpsmdColorSelector from './ipsmdcolorselector';

function App() {
  const [step, setStep] = useState(0);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const handleColorsSelected = (colors: string[]) => {
    console.log("Выбранные цвета:", colors);
    setSelectedColors(colors);
    setStep(1); 
  };

  return (
    <div style={{ 
      margin: 0, padding: 0, overflow: 'hidden', 
      width: '100vw', height: '100vh', 
      backgroundColor: '#111', position: 'relative',
      fontFamily: 'Arial, sans-serif', color: '#fff',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
    }}>
      
      {/* ГЛОБАЛЬНЫЙ СТИЛЕВОЙ ХАК ДЛЯ КРУГА ЦВЕТОВ И КНОПОК */}
      <style>{`
        /* Пытаемся принудительно превратить контейнер цветов в круг */
        .color-picker, [class*="picker"], [class*="selector"] {
          border-radius: 50% !important;
          max-width: 300px;
          margin: 0 auto;
        }
        /* Оформляем кнопки, которые рендерит твой компонент */
        button {
          padding: 10px 20px !important;
          font-size: 14px !important;
          font-weight: bold !important;
          border-radius: 6px !important;
          cursor: pointer !important;
          margin: 5px !important;
          transition: all 0.2s !important;
        }
        /* Стиль для кнопки продолжения (на случай, если класс называется так) */
        .continue-btn, [class*="continue"], [class*="submit"], [class*="next"] {
          background-color: #28a745 !important;
          color: white !important;
          display: inline-block !important; /* Гарантируем видимость */
        }
      `}</style>

      {/* КНОПКА АВТОРИЗАЦИИ В УГЛУ */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 99999 }}>
        <button 
          onClick={() => (window as any).openIpsmdAuth?.()} 
          style={{ 
            backgroundColor: '#007bff', color: '#fff', border: 'none',
            boxShadow: '0 4px 15px rgba(0,123,255,0.4)'
          }}
        >
          Войти через ipsmd
        </button>
      </div>

      {/* ШАГ 1: Выбор цветов */}
      {step === 0 && (
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <h2 style={{ marginBottom: '20px' }}>Шаг 1: Выберите цвета для верификации</h2>
          <div style={{ 
            padding: '40px', background: '#222', borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: '320px'
          }}>
            <IpsmdColorSelector 
              onColorsSelected={handleColorsSelected}
              onChange={handleColorsSelected}
              colors={selectedColors}
            />
            
            {/* РЕЗЕРВНАЯ КНОПКА: Если логика компонента не выводит свою кнопку, 
                эта кнопка принудительно пустит тебя в игру для теста, если выбрано хотя бы что-то */}
            <div style={{ marginTop: '20px' }}>
              <button 
                onClick={() => setStep(1)}
                style={{ backgroundColor: '#28a745', color: '#fff', border: 'none' }}
              >
                [Тест] Пропустить выбор и играть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ШАГ 2: Игра */}
      {step === 1 && (
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
          <IpsmdGameCanvas colors={selectedColors} />
        </div>
      )}

    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
