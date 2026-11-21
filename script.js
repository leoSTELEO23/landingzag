document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('leadForm');
    const consentCheckbox = document.getElementById('consentCheckbox');
    const submitBtn = form.querySelector('.btn-submit');
    const toast = document.getElementById('toast');
    let toastTimer;

    // Функция показа уведомления
    function showToast(message) {
        clearTimeout(toastTimer);
        toast.querySelector('.toast__text').textContent = message;
        toast.classList.add('toast--visible');
        toastTimer = setTimeout(() => {
            toast.classList.remove('toast--visible');
        }, 3000);
    }

    // Отслеживаем состояние чекбокса
    consentCheckbox.addEventListener('change', () => {
        submitBtn.disabled = !consentCheckbox.checked;
    });

    // Обработка отправки формы
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Дополнительная проверка (на случай, если кто-то обойдет disabled)
        if (!consentCheckbox.checked) {
            showToast('Пожалуйста, дайте согласие на обработку данных');
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        console.log('Заявка собрана:', data);

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем...';

        try {
            await mockApiCall(data);
            showToast('Заявка отправлена!');
            form.reset();
            // После сброса формы чекбокс снова не отмечен, кнопка снова disabled
        } catch (error) {
            showToast('Ошибка. Попробуйте еще раз.');
        } finally {
            submitBtn.disabled = !consentCheckbox.checked;
            submitBtn.textContent = 'Отправить заявку';
        }
    });
});

function mockApiCall(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Данные улетели на сервер:', data);
            resolve();
        }, 1000);
    });
}