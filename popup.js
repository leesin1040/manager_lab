document.getElementById('runScript').addEventListener('click', () => {
  const button = document.getElementById('runScript');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: extractAllNames,
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          const clipboardText = results[0].result.join('\n');
          navigator.clipboard
            .writeText(clipboardText)
            .then(() => {
              console.log('Copied to clipboard:', results[0].result);
              button.textContent = '복사 완료!';
              button.style.backgroundColor = '#2196F3';

              // 3초 후 원래 텍스트로 복귀
              setTimeout(() => {
                button.textContent = '모든 이름 복사하기';
                button.style.backgroundColor = '#4caf50';
              }, 3000);
            })
            .catch((err) => {
              console.error('Error copying to clipboard:', err);
              button.textContent = '복사 실패';
              button.style.backgroundColor = '#f44336';
            });
        }
      }
    );
  });
});

function extractAllNames() {
  const containers = document.querySelectorAll('.css-856oyk');
  let names = [];

  containers.forEach((container) => {
    const nameElement = container.querySelector('.css-t5162q');
    if (nameElement) {
      const name = nameElement.textContent.trim();
      if (name) {
        names.push(name);
      }
    }
  });

  return [...new Set(names)];
}
