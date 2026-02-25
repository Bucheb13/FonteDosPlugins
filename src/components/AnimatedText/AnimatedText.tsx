"use client";
import "./AnimatedText.css";

export default function AnimatedText() {
  return (
    <span className="rotator" aria-label="Preço a partir de">
      <span className="rotator__container">
        <span className="rotator__text">R$</span>

        <ul className="rotator__list">
          <li className="rotator__item">7,00/Mês</li>
          <li className="rotator__item">22,00/Ano</li>
          <li className="rotator__item">7,00/Mês</li>
          <li className="rotator__item">22,00/Ano</li>
        </ul>
      </span>
    </span>
  );
}
