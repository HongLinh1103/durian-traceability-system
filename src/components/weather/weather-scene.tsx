import type { CSSProperties } from "react";

type WeatherSceneKind = "sunny" | "cloudy" | "rain" | "thunderstorm";

function getScene(code: number): WeatherSceneKind {
    if (code === 0) return "sunny";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
    if ([95, 96, 99].includes(code)) return "thunderstorm";
    return "cloudy";
}

const rainDrops = Array.from({ length: 36 }, (_, index) => ({
    left: `${(index * 29 + 7) % 100}%`,
    delay: `${-((index * 17) % 13) / 10}s`,
    duration: `${0.65 + (index % 6) * 0.08}s`,
}));

export function WeatherScene({ weatherCode, isDay }: { weatherCode: number; isDay: boolean }) {
    const scene = getScene(weatherCode);
    const raining = scene === "rain" || scene === "thunderstorm";

    return <div className={`weather-scene weather-scene--${scene} ${isDay ? "weather-scene--day" : "weather-scene--night"}`} aria-hidden="true">
        <div className="weather-scene__photo weather-scene__photo--back" />
        <div className="weather-scene__photo weather-scene__photo--front" />
        {raining && <div className="weather-rain">{rainDrops.map((drop, index) => <span key={index} style={{ "--drop-left": drop.left, "--drop-delay": drop.delay, "--drop-duration": drop.duration } as CSSProperties} />)}</div>}
        {scene === "thunderstorm" && <div className="weather-lightning" />}
        <div className="weather-scene__veil" />
    </div>;
}
