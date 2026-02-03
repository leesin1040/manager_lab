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

// 줌 참가자 명단 복사 기능
document.getElementById('copyZoomParticipants').addEventListener('click', () => {
  const button = document.getElementById('copyZoomParticipants');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0] && tabs[0].id;
    if (!tabId) {
      updateButtonStatus(button, false);
      return;
    }

    chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
      const frameIds = (frames || [])
        .map((frame) => frame.frameId)
        .filter((id) => Number.isInteger(id));

      chrome.scripting.executeScript(
        {
          target: { tabId, frameIds },
          function: extractZoomParticipants,
        },
        async (results) => {
          const names = (results || [])
            .flatMap((item) => (Array.isArray(item.result) ? item.result : []))
            .filter((name) => typeof name === 'string' && name.length > 0)
            .filter((name, index, arr) => arr.indexOf(name) === index);

          navigator.clipboard
            .writeText(names.join('\n'))
            .then(() => updateButtonStatus(button, names.length > 0))
            .catch(() => updateButtonStatus(button, false));
        }
      );
    });
  });
});

// 잽 접속자 이름 추출 함수
function extractPlayerNames() {
  const playerListButton = document.querySelector(
    '#play-ui-layout > div.px-safe.relative.flex.flex-1.flex-col.overflow-hidden > header > div.flex.items-center.gap-\\[4px\\] > div.PlayerCount_player_count_wrapper__cJhdr > div > div > button'
  );

  if (playerListButton) {
    const waitFor = (predicate, timeoutMs = 2000, intervalMs = 50) =>
      new Promise((resolve) => {
        const start = Date.now();
        const timer = setInterval(() => {
          if (predicate()) {
            clearInterval(timer);
            resolve(true);
          } else if (Date.now() - start > timeoutMs) {
            clearInterval(timer);
            resolve(false);
          }
        }, intervalMs);
      });

    playerListButton.click();
    return new Promise(async (resolve) => {
      try {
        // 패널 로딩 대기: 이름 요소가 나타날 때까지 대기
        await waitFor(
          () => {
            const spans = document.getElementsByClassName(
              'PlayerList_name__GzV5T'
            );
            return spans && spans.length > 0;
          },
          2000,
          50
        );

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

        // 닫기 시도 1: 닫기 버튼 클릭
        const closeButton = document.querySelector(
          '#__next > div.z-panel.pointer-events-auto.fixed.bottom-\\[14px\\].right-\\[20px\\].flex.max-h-\\[70vh\\].min-h-\\[320px\\].w-\\[300px\\].overflow-hidden.rounded-\\[8px\\].bg-white.shadow-lg > div > header > div > div > button:nth-child(2)'
        );
        if (closeButton) {
          closeButton.click();
        } else {
          // 닫기 시도 2: ESC 키 전송
          const evt = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
          });
          document.dispatchEvent(evt);

          // 닫기 시도 3: 토글 버튼 다시 클릭
          const maybeStillOpen =
            document.getElementsByClassName('PlayerList_name__GzV5T').length >
            0;
          if (maybeStillOpen && playerListButton) {
            playerListButton.click();
          }
        }

        resolve(names);
      } catch (e) {
        resolve([]);
      }
    });
  }
  return [];
}

// 줌 참가자 이름 추출 함수 (웹 버전 줌 기준)
function extractZoomParticipants() {
  try {
    const participants = [];
    const participantElements = document.querySelectorAll(
      '[class*="participants-item"]'
    );

    participantElements.forEach((el) => {
      const nameEl = el.querySelector('[class*="display-name"]');
      if (nameEl) {
        const name = nameEl.textContent.trim();
        if (name && !participants.includes(name)) {
          participants.push(name);
        }
      }
    });

    return participants;
  } catch (e) {
    return [];
  }
}

// 완료자 이름 복사 버튼: 특정 페이지에서 상태 텍스트 기준으로 이름 수집
document.getElementById('copyCompletedNames').addEventListener('click', () => {
  const button = document.getElementById('copyCompletedNames');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: extractCompletedNames,
      },
      async (results) => {
        const text = results && results[0] ? results[0].result || '' : '';
        if (typeof text === 'string') {
          navigator.clipboard
            .writeText(text)
            .then(() => updateButtonStatus(button, text.length > 0))
            .catch(() => updateButtonStatus(button, false));
        } else {
          updateButtonStatus(button, false);
        }
      }
    );
  });
});

// 특정 페이지: '입실 완료' 또는 '입실(지각)완료'에서 5칸 위 텍스트를 이름으로 수집
function extractCompletedNames() {
  try {
    const arr = [...document.querySelectorAll('*')]
      .map((el) => (el.textContent || '').trim())
      .filter((text) => text.length > 0);
    const names = arr.reduce((list, text, idx) => {
      if (text === '입실 완료' || text === '입실(지각)완료') {
        const name = arr[idx - 5];
        if (name) list.push(name);
      }
      return list;
    }, []);
    return names.join('\n');
  } catch (e) {
    return '';
  }
}
