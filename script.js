document.addEventListener('DOMContentLoaded', function() {
    
    const apiKey = '0424117ab529ab6e34aa57c2a19772a1';
    
    const cityInput = document.getElementById('cityInput');
    const searchBtn = document.getElementById('searchBtn');
    const forecastResult = document.getElementById('forecastResult');
    const celsiusBtn = document.getElementById('celsiusBtn');
    const fahrenheitBtn = document.getElementById('fahrenheitBtn');
    
    // عناصر العرض
    const cityNameEl = document.getElementById('cityName');
    const tempEl = document.getElementById('temp');
    const weatherIcon = document.getElementById('weatherIcon');
    const descriptionEl = document.getElementById('description');
    const humidityEl = document.getElementById('humidity');
    const windEl = document.getElementById('wind');
    const feelsLikeEl = document.getElementById('feelsLike');
    const windUnitEl = document.getElementById('windUnit');
    
    let currentCity = '';
    let currentUnit = 'metric';
    let currentTemp = null;
    
    // ===== الخريطة =====
    let map = null;
    let marker = null;
    
    function updateMap(lat, lon, cityName) {
        if (map === null) {
            map = L.map('map').setView([lat, lon], 10);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
                subdomains: 'abcd',
                maxZoom: 19,
                minZoom: 3
            }).addTo(map);
        } else {
            map.setView([lat, lon], 10);
        }
        
        if (marker) {
            map.removeLayer(marker);
        }
        
        marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`📍 ${cityName}`).openPopup();
    }
    
    // ===== الإشعارات =====
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
    function sendWeatherNotification(cityName, temp, description) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🌤️ Weather in ${cityName}`, {
                body: `${temp}°C, ${description}`,
                icon: 'https://openweathermap.org/img/wn/01d@2x.png',
                silent: false
            });
        }
    }
    
    requestNotificationPermission();
    
    // ===== المشاركة =====
    function shareWeather(cityName, temp, tempUnit, description) {
        const text = `🌤️ Weather in ${cityName}: ${temp}${tempUnit}, ${description}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Weather App',
                text: text,
                url: window.location.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text);
            alert('✅ Weather info copied to clipboard!');
        }
    }
    
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
            const city = currentCity;
            const temp = currentTemp ? Math.round(currentTemp) : '--';
            const desc = descriptionEl.textContent || '';
            if (city) {
                shareWeather(city, temp, tempUnit, desc);
            } else {
                alert('Please search for a city first');
            }
        });
    }
    
    // ===== الوضع الليلي/النهاري =====
    const themeBtn = document.getElementById('themeBtn');
    let isDarkMode = true;
    
    function toggleTheme() {
        isDarkMode = !isDarkMode;
        if (isDarkMode) {
            document.body.classList.remove('light-mode');
            themeBtn.textContent = '🌙 Dark';
        } else {
            document.body.classList.add('light-mode');
            themeBtn.textContent = '☀️ Light';
        }
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        isDarkMode = false;
        document.body.classList.add('light-mode');
        themeBtn.textContent = '☀️ Light';
    }
    
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
    
    // ===== تحميل آخر مدينة =====
    const savedCity = localStorage.getItem('lastCity');
    if (savedCity) {
        cityInput.value = savedCity;
        getWeather(savedCity);
    }
    
    // ===== تبديل الوحدات =====
    celsiusBtn.addEventListener('click', function() {
        if (currentUnit === 'metric') return;
        currentUnit = 'metric';
        celsiusBtn.classList.add('unit-active');
        fahrenheitBtn.classList.remove('unit-active');
        if (currentCity) getWeather(currentCity);
    });
    
    fahrenheitBtn.addEventListener('click', function() {
        if (currentUnit === 'imperial') return;
        currentUnit = 'imperial';
        fahrenheitBtn.classList.add('unit-active');
        celsiusBtn.classList.remove('unit-active');
        if (currentCity) getWeather(currentCity);
    });
    
    // ===== تغيير الخلفية حسب الطقس =====
    function changeBackground(weatherCondition) {
        const body = document.body;
        const condition = weatherCondition.toLowerCase();
        
        if (condition.includes('clear') || condition.includes('sunny')) {
            body.style.backgroundImage = "url('images/background2.png')";
        } else if (condition.includes('cloud')) {
            body.style.backgroundImage = "url('images/background2.png')";
        } else if (condition.includes('rain') || condition.includes('drizzle')) {
            body.style.backgroundImage = "url('images/background2.png')";
        } else if (condition.includes('snow')) {
            body.style.backgroundImage = "url('images/background2.png')";
        }
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
    }
    
    // ===== جلب الطقس الحالي =====
    function getWeather(city) {
        if (!city || city.trim() === '') {
            cityNameEl.textContent = '📍 Please enter a city';
            tempEl.textContent = '--°C';
            descriptionEl.textContent = '';
            return;
        }
        
        currentCity = city;
        localStorage.setItem('lastCity', city);
        
        forecastResult.innerHTML = '<div class="loading">⏳ Loading forecast...</div>';
        
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${currentUnit}`;
        
        fetch(url)
            .then(response => {
                if (response.status === 401) throw new Error('Invalid API key');
                if (response.status === 404) throw new Error(`City "${city}" not found`);
                if (!response.ok) throw new Error(`Error ${response.status}`);
                return response.json();
            })
            .then(data => {
                const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
                const windUnit = currentUnit === 'metric' ? 'm/s' : 'mph';
                const tempValue = Math.round(data.main.temp);
                const feelsLike = Math.round(data.main.feels_like);
                const humidity = data.main.humidity;
                const windSpeed = data.wind.speed;
                const description = data.weather[0].description;
                const icon = data.weather[0].icon;
                
                currentTemp = data.main.temp;
                
                cityNameEl.textContent = `📍 ${data.name}, ${data.sys.country}`;
                tempEl.textContent = `🌡️ ${tempValue}${tempUnit}`;
                weatherIcon.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
                descriptionEl.textContent = description;
                humidityEl.textContent = humidity;
                windEl.textContent = windSpeed;
                windUnitEl.textContent = windUnit;
                feelsLikeEl.textContent = feelsLike;
                
                changeBackground(description);
                sendWeatherNotification(data.name, tempValue, description);
                updateMap(data.coord.lat, data.coord.lon, data.name);
                getForecast(city);
            })
            .catch(error => {
                cityNameEl.textContent = `❌ ${error.message}`;
                tempEl.textContent = '--°C';
                descriptionEl.textContent = '';
                humidityEl.textContent = '--';
                windEl.textContent = '--';
                feelsLikeEl.textContent = '--';
                forecastResult.innerHTML = `<div class="error-message">❌ ${error.message}</div>`;
            });
    }
    
    // ===== جلب توقعات 5 أيام =====
    function getForecast(city) {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${currentUnit}`;
        
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Not available');
                return response.json();
            })
            .then(data => {
                const forecastByDay = {};
                data.list.forEach(item => {
                    const date = new Date(item.dt * 1000);
                    const day = date.toLocaleDateString('en', { weekday: 'short' });
                    const dateKey = date.toLocaleDateString('en');
                    if (!forecastByDay[dateKey]) {
                        forecastByDay[dateKey] = {
                            day: day,
                            temp: item.main.temp,
                            icon: item.weather[0].icon,
                            description: item.weather[0].description
                        };
                    }
                });
                
                const forecastDays = Object.values(forecastByDay).slice(0, 5);
                const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
                
                forecastResult.innerHTML = `
                    <div class="forecast-title">📅 5-Day Forecast</div>
                    <div class="forecast-days">
                        ${forecastDays.map(day => `
                            <div class="forecast-day">
                                <div class="day">${day.day}</div>
                                <img src="https://openweathermap.org/img/wn/${day.icon}.png">
                                <div class="forecast-temp">${Math.round(day.temp)}${tempUnit}</div>
                                <div class="forecast-desc">${day.description}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            })
            .catch(error => {
                forecastResult.innerHTML = `<div class="error-message">❌ Forecast: ${error.message}</div>`;
            });
    }
    
    searchBtn.addEventListener('click', () => getWeather(cityInput.value));
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') getWeather(cityInput.value);
    });
});