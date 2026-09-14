(() => {
  const sessionId = window.location.pathname.split('/').filter(Boolean).pop();
  const imageWrap = document.getElementById('imageWrap');
  const btnDownload = document.getElementById('btnDownload');
  const doneMsg = document.getElementById('doneMsg');

  let imageUrl = null;

  async function load() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      imageUrl = data.imageUrl;

      imageWrap.innerHTML = `<img src="${imageUrl}" alt="네컷 사진" />`;
      btnDownload.style.display = 'block';
    } catch (err) {
      imageWrap.innerHTML = '<div id="error">사진을 찾을 수 없어요.<br/>QR을 다시 확인해주세요.</div>';
    }
  }

  btnDownload.addEventListener('click', async () => {
    btnDownload.disabled = true;
    btnDownload.textContent = '다운로드 중…';
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'necut.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      // 촬영 기기에 다운로드 완료 신호 보내기 (기기는 자동으로 첫 화면으로 복귀)
      fetch(`/api/sessions/${sessionId}/downloaded`, { method: 'POST' }).catch(() => {});

      btnDownload.style.display = 'none';
      doneMsg.style.display = 'block';
    } catch (err) {
      alert('다운로드에 실패했어요. 이미지를 길게 눌러 저장해보세요.');
      btnDownload.disabled = false;
      btnDownload.textContent = '사진 다운로드';
    }
  });

  load();
})();
