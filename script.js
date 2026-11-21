document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('leadForm');
    const toast = document.getElementById('toast');
    let toastTimer;

    // Функция показа уведомления
    function showToast(message) {
        clearTimeout(toastTimer);

        toast.querySelector('.toast__text').textContent = message;
        toast.classList.add('toast--visible');

        // Через 3 секунды прячем
        toastTimer = setTimeout(() => {
            toast.classList.remove('toast--visible');
        }, 3000);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        console.log('Заявка собрана:', data);

        const btn = form.querySelector('.btn-submit');
        btn.disabled = true;
        btn.textContent = 'Отправляем...';

        try {
            await mockApiCall(data);

            // Вызываем всплывающее окошко
            showToast('Заявка отправлена!');
            form.reset();
        } catch (error) {
            showToast('Ошибка. Попробуйте еще раз.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Отправить заявку';
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