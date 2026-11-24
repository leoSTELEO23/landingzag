// Интро: облака раздвигаются при скролле, затем проявляется hero
(function initIntro() {
    const intro = document.getElementById('intro');
    if (!intro || !document.documentElement.classList.contains('js-intro')) return;

    const root = document.documentElement;
    let target = 0;
    let current = 0;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    function read() {
        const rect = intro.getBoundingClientRect();
        const distance = intro.offsetHeight - window.innerHeight;
        target = Math.min(1, Math.max(0, -rect.top / distance));
    }

    function tick() {
        current += (target - current) * 0.12;
        if (Math.abs(target - current) < 0.0005) current = target;
        const p = ease(current);
        const ui = Math.min(1, Math.max(0, (p - 0.45) / 0.4));
        root.style.setProperty('--p', p.toFixed(4));
        root.style.setProperty('--ui', ui.toFixed(3));
        requestAnimationFrame(tick);
    }

    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    read();
    tick();

    // Показываем сцену, когда облака загрузились (или через 2,5 с)
    const ready = () => intro.classList.add('is-ready');
    const img = new Image();
    img.onload = img.onerror = ready;
    img.src = 'assets/intro-clouds.webp';
    setTimeout(ready, 2500);
})();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('leadForm');
    const consentCheckbox = document.getElementById('consentCheckbox');
    const submitBtn = form.querySelector('.btn-submit');
    const statusEl = document.getElementById('formStatus');
    const toast = document.getElementById('toast');

    // Адрес серверной функции или endpoint формы подписки.
    // ВАЖНО: пока пусто, заявки НЕ сохраняются (режим демо).
    // API-ключ сервиса рассылок в этот файл класть нельзя.
    const ENDPOINT = '';
    const CONSENT_VERSION = '2026-11-21'; // меняйте при изменении текста согласия
    const MIN_FILL_TIME_MS = 2500;
    const TIMEOUT_MS = 10000;

    const pageLoadedAt = Date.now();
    let toastTimer;
    let isSending = false;

    function showToast(message) {
        clearTimeout(toastTimer);
        toast.querySelector('.toast__text').textContent = message;
        toast.classList.add('toast--visible');
        toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 3000);
    }

    function updateButton() {
        submitBtn.disabled = isSending || !consentCheckbox.checked;
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    }

    async function sendLead(payload) {
        if (!ENDPOINT) {
            console.warn('ENDPOINT не задан: заявка не отправлена (демо-режим).');
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
            showToast('Пожалуйста, дайте согласие на обработку данных');
            return;
        }

        const email = form.elements['email'].value.trim();
        if (!isValidEmail(email)) {
            statusEl.textContent = 'Проверьте адрес email.';
            return;
        }

        // Бот: заполнено скрытое поле или форма отправлена слишком быстро.
        // Показываем «успех», но ничего не отправляем.
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
            showToast('Ошибка. Попробуйте ещё раз.');
        } finally {
            isSending = false;
            submitBtn.textContent = 'Отправить заявку';
            updateButton();
        }
    });
});
