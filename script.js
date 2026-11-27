// 1. ИНТРО: один жест вниз запускает анимацию, пока она идёт, скролл заблокирован
(function initIntro() {
    const root = document.documentElement;
    const intro = document.getElementById('intro');
    if (!intro || !root.classList.contains('js-intro')) return;

    const DURATION = 3200;
    const AUTO_START_MS = 6000; // если пользователь ничего не делает
    let started = false;
    let startTime = null;

    // Всегда начинаем сверху и блокируем скролл с первой секунды
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    root.classList.add('intro-lock');

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function tick(now) {
        if (startTime === null) startTime = now;
        const raw = Math.min(1, (now - startTime) / DURATION);
        const p = easeOutCubic(raw);
        const ui = Math.min(1, Math.max(0, (p - 0.5) / 0.35));
        root.style.setProperty('--p', p.toFixed(4));
        root.style.setProperty('--ui', ui.toFixed(3));
        if (raw < 1) requestAnimationFrame(tick);
        else finish();
    }

    function finish() {
        root.style.setProperty('--p', '1');
        root.style.setProperty('--ui', '1');
        root.classList.remove('intro-lock');
        root.classList.add('intro-done'); // скрывает облака и подсказку, hero остаётся в потоке
        removeListeners();
    }

    function start() {
        if (started) return;
        started = true;
        removeListeners();
        requestAnimationFrame(tick);
    }

    // Намерение «листать вниз»: колесо, свайп вверх, клавиши
    let touchY = null;
    const onWheel = (e) => { if (e.deltaY > 0) start(); };
    const onTouchStart = (e) => { touchY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
        if (touchY !== null && touchY - e.touches[0].clientY > 10) start();
    };
    const onKey = (e) => {
        if (['ArrowDown', 'PageDown', 'End', ' ', 'Tab'].includes(e.key)) {
            e.preventDefault();
            start();
        }
    };
    function removeListeners() {
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('keydown', onKey);
    }
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKey);

    // Показываем облака, когда картинка загрузилась (или через 2,5 с)
    const ready = () => root.classList.add('intro-ready');
    const img = new Image();
    img.onload = img.onerror = ready;
    img.src = 'assets/intro-clouds.webp';
    setTimeout(ready, 2500);

    setTimeout(start, AUTO_START_MS);
})();


// 2. ФОРМА И ВАЛИДАЦИЯ
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('leadForm');
    const consentCheckbox = document.getElementById('consentCheckbox');
    const submitBtn = form.querySelector('.btn-submit');
    const statusEl = document.getElementById('formStatus');
    const toast = document.getElementById('toast');

    const ENDPOINT = ''; // Сюда вставишь ссылку от сервиса рассылок
    const CONSENT_VERSION = '2026-11-21'; 
    const MIN_FILL_TIME_MS = 2500;
    const TIMEOUT_MS = 10000;

    const pageLoadedAt = Date.now();
    let toastTimer;
    let isSending = false;

    // Маскот в уведомлении: у каждого состояния своя поза
    const TOAST_TYPES = {
        success: { title: 'Заявка принята', img: 'assets/mascot-success.webp' },
        warning: { title: 'Нужно согласие', img: 'assets/mascot-warning.webp' },
        error: { title: 'Что-то пошло не так', img: 'assets/mascot-error.webp' }
    };
    Object.values(TOAST_TYPES).forEach((t) => { new Image().src = t.img; }); // предзагрузка

    function showToast(message, type = 'success', title) {
        clearTimeout(toastTimer);
        const t = TOAST_TYPES[type] || TOAST_TYPES.success;
        toast.dataset.type = type;
        toast.querySelector('.toast__mascot').src = t.img;
        toast.querySelector('.toast__title').textContent = title || t.title;
        toast.querySelector('.toast__text').textContent = message;
        toast.classList.remove('toast--visible');
        void toast.offsetWidth; // перезапуск анимации маскота
        toast.classList.add('toast--visible');
        toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 4500);
    }

    function updateButton() {
        submitBtn.disabled = isSending || !consentCheckbox.checked;
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    }

    // Телефон: только цифры, пробелы, дефисы, скобки и «+» в начале; от 10 до 15 цифр
    function isValidPhone(value) {
        if (!/^\+?[\d\s\-()]+$/.test(value)) return false;
        const digits = value.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    }

    function markInvalid(input) {
        input.setAttribute('aria-invalid', 'true');
        input.focus();
    }

    const phoneInput = form.elements['phone'];
    const emailInput = form.elements['email'];

    // Нельзя ввести буквы и прочий мусор (в том числе вставкой и автозаполнением)
    phoneInput.addEventListener('input', () => {
        let v = phoneInput.value.replace(/[^\d+\s\-()]/g, '');
        v = v.replace(/(?!^)\+/g, ''); // «+» только в начале
        if (v !== phoneInput.value) phoneInput.value = v;
        phoneInput.removeAttribute('aria-invalid');
    });
    emailInput.addEventListener('input', () => emailInput.removeAttribute('aria-invalid'));

    async function sendLead(payload) {
        if (!ENDPOINT) {
            console.warn('Демо-режим: заявка не отправлена.');
            await new Promise((resolve) => setTimeout(resolve, 800));
            return;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    consentCheckbox.addEventListener('change', updateButton);
    updateButton();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSending) return;

        if (!consentCheckbox.checked) {
            showToast('Пожалуйста, дайте согласие на обработку данных', 'warning');
            return;
        }

        const phone = phoneInput.value.trim();
        if (!isValidPhone(phone)) {
            statusEl.textContent = 'Проверьте номер телефона.';
            markInvalid(phoneInput);
            showToast('Введите номер в формате +7 900 123-45-67', 'error', 'Проверьте номер');
            return;
        }

        const email = emailInput.value.trim();
        if (!isValidEmail(email)) {
            statusEl.textContent = 'Проверьте адрес email.';
            markInvalid(emailInput);
            showToast('Введите адрес в формате name@mail.ru', 'error', 'Проверьте email');
            return;
        }
        statusEl.textContent = '';

        const honeypot = form.elements['website'];
        const tooFast = Date.now() - pageLoadedAt < MIN_FILL_TIME_MS;
        
        if ((honeypot && honeypot.value.trim() !== '') || tooFast) {
            showToast('Спасибо! Вы в списке.');
            form.reset();
            updateButton();
            return;
        }

        const payload = {
            email,
            phone,
            name: form.elements['name'].value.trim(),
            consent: {
                given: true,
                version: CONSENT_VERSION,
                givenAt: new Date().toISOString(),
                pageUrl: location.href
            }
        };

        isSending = true;
        updateButton();
        submitBtn.textContent = 'Отправляем...';
        statusEl.textContent = '';

        try {
            await sendLead(payload);
            showToast('Спасибо! Вы в списке.');
            form.reset();
        } catch (error) {
            statusEl.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз позже.';
            showToast('Ошибка. Попробуйте ещё раз.', 'error');
        } finally {
            isSending = false;
            submitBtn.textContent = 'Отправить заявку';
            updateButton();
        }
    });
});

// 3. Плавное появление блоков при прокрутке
(function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length || !('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('reveal-on');
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    items.forEach((el) => io.observe(el));
})();
