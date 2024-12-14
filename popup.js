function updateButtonStatus(button, success = true) {
  const originalText = button.textContent;
  const originalColor = button.style.backgroundColor;

  button.textContent = success ? '복사 완료!' : '복사 실패';
  button.style.backgroundColor = success ? '#2196F3' : '#f44336';

  setTimeout(() => {
    button.textContent = originalText;
    button.style.backgroundColor = originalColor;
  }, 3000);
}

// 잽 접속자 명단 복사 기능
document.getElementById('copyPlayerNames').addEventListener('click', () => {
  const button = document.getElementById('copyPlayerNames');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: extractPlayerNames,
      },
      async (results) => {
        if (results && results[0] && results[0].result) {
          const names = await results[0].result;
          navigator.clipboard
            .writeText(names.join('\n'))
            .then(() => updateButtonStatus(button))
            .catch(() => updateButtonStatus(button, false));
        }
      }
    );
  });
});

// 잽 접속자 이름 추출 함수
function extractPlayerNames() {
  const playerListButton = document.querySelector(
    '#play-ui-layout > div.px-safe.relative.flex.flex-1.flex-col.overflow-hidden > header > div.flex.items-center.gap-\\[4px\\] > div.PlayerCount_player_count_wrapper__cJhdr > div > div > button'
  );

  if (playerListButton) {
    playerListButton.click();
    return new Promise((resolve) => {
      setTimeout(() => {
        const spanClasses = document.getElementsByClassName(
          'PlayerList_name__GzV5T'
        );
        let names = [];
        Array.from(spanClasses).forEach((span) => {
          let name = span.innerHTML
            .split('(')[0]
            .replace(
              /[^a-zA-Z/\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7A3\uD7B0-\uD7FF]/g,
              ''
            );
          names.push(name);
        });

        // 닫기 버튼 클릭
        const closeButton = document.querySelector(
          '#__next > div.z-panel.pointer-events-auto.fixed.bottom-\\[14px\\].right-\\[20px\\].flex.max-h-\\[70vh\\].min-h-\\[320px\\].w-\\[300px\\].overflow-hidden.rounded-\\[8px\\].bg-white.shadow-lg > div > header > div > div > button:nth-child(2)'
        );
        if (closeButton) {
          closeButton.click();
        }

        resolve(names);
      }, 500);
    });
  }
  return [];
}

// 전체 데이터 복사 기능
document.getElementById('copyAllData').addEventListener('click', () => {
  const button = document.getElementById('copyAllData');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: extractAllData,
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          navigator.clipboard
            .writeText(results[0].result)
            .then(() => updateButtonStatus(button))
            .catch(() => updateButtonStatus(button, false));
        }
      }
    );
  });
});

// 모든 데이터 추출 함수
function extractAllData() {
  const containers = document.querySelectorAll('.css-856oyk');
  let data = [];

  containers.forEach((container) => {
    const nameElement = container.querySelector('.css-t5162q');
    const hrdElement = container.querySelector('.css-1bu79bc');
    const todayElement = container.querySelector('.css-1r3nu2g');

    const name = nameElement ? nameElement.textContent.trim() : '';
    const hrd = hrdElement ? hrdElement.textContent.trim() : '';
    const today = todayElement ? todayElement.textContent.trim() : '';

    if (name) {
      data.push(`${name}\t${hrd}\t${today}`);
    }
  });

  return data.join('\n');
}
