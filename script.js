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
