function updateButtonStatus(button, success = true) {
  const originalText = button.textContent;
  const originalColor = button.style.backgroundColor;

  button.textContent = success ? '복사 완료!' : '복사 실패';
  button.style.backgroundColor = success ? '#2196F3' : '#f44336';

  setTimeout(() => {
    button.textContent = originalText;
    button.style.backgroundColor = '#4caf50';
  }, 3000);
}

// 기존 이름 복사 기능
document.getElementById('copyNames').addEventListener('click', () => {
  const button = document.getElementById('copyNames');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: extractAllNames,
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          navigator.clipboard
            .writeText(results[0].result.join('\n'))
            .then(() => updateButtonStatus(button))
            .catch(() => updateButtonStatus(button, false));
        }
      }
    );
  });
});

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

// HRD 상태 복사 기능
document.getElementById('copyHRDStatus').addEventListener('click', () => {
  const button = document.getElementById('copyHRDStatus');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: extractHRDStatus,
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          navigator.clipboard
            .writeText(results[0].result.join('\n'))
            .then(() => updateButtonStatus(button))
            .catch(() => updateButtonStatus(button, false));
        }
      }
    );
  });
});

// 오늘 상태 복사 기능
document.getElementById('copyTodayStatus').addEventListener('click', () => {
  const button = document.getElementById('copyTodayStatus');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: extractTodayStatus,
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          navigator.clipboard
            .writeText(results[0].result.join('\n'))
            .then(() => updateButtonStatus(button))
            .catch(() => updateButtonStatus(button, false));
        }
      }
    );
  });
});

// 백오피스 이름 추출 함수
function extractAllNames() {
  const containers = document.querySelectorAll('.css-856oyk');
  let names = [];
  containers.forEach((container) => {
    const nameElement = container.querySelector('.css-t5162q');
    if (nameElement) {
      const name = nameElement.textContent.trim();
      if (name) names.push(name);
    }
  });
  return [...new Set(names)];
}

// 잽 접속자 이름 추출 함수
function extractPlayerNames() {
  // 먼저 플레이어 목록 버튼 찾기
  const playerListButton = document.querySelector(
    '#play-ui-layout > div.px-safe.relative.flex.flex-1.flex-col.overflow-hidden > header > div.flex.items-center.gap-\\[4px\\] > div.PlayerCount_player_count_wrapper__cJhdr > div > div > button'
  );

  if (playerListButton) {
    // 버튼 클릭
    playerListButton.click();

    // 목록이 나타날 때까지 잠시 대기
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
        resolve(names);
      }, 500); // 500ms 대기
    });
  }
  return [];
}

// HRD 상태 추출 함수
function extractHRDStatus() {
  const containers = document.querySelectorAll('.css-856oyk');
  let statuses = [];
  containers.forEach((container) => {
    const statusElement = container.querySelector('.css-1bu79bc');
    if (statusElement) {
      const status = statusElement.textContent.trim();
      if (status) statuses.push(status);
    }
  });
  return statuses;
}

// 오늘 상태 추출 함수
function extractTodayStatus() {
  const containers = document.querySelectorAll('.css-856oyk');
  let statuses = [];
  containers.forEach((container) => {
    const statusElement = container.querySelector('.css-1r3nu2g');
    if (statusElement) {
      const status = statusElement.textContent.trim();
      if (status) statuses.push(status);
    }
  });
  return statuses;
}
