function extractAllNamesAndCopyToClipboard() {
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

  const uniqueNames = [...new Set(names)];
  const clipboardText = uniqueNames.join('\n');

  navigator.clipboard
    .writeText(clipboardText)
    .then(() => {
      console.log('Copied to clipboard:', uniqueNames);
      alert('Names copied to clipboard!');
    })
    .catch((err) => {
      console.error('Error copying to clipboard:', err);
    });
}

// 버튼 생성 및 이벤트 연결
function createButton() {
  const button = document.createElement('button');
  button.textContent = 'Copy All Names';
  button.style.position = 'fixed';
  button.style.bottom = '10px';
  button.style.right = '10px';
  button.style.zIndex = '1000';

  button.onclick = () => {
    extractAllNamesAndCopyToClipboard();
    button.remove(); // 클릭 후 버튼 제거
  };

  document.body.appendChild(button);
}

// 페이지에 버튼 추가
createButton();
