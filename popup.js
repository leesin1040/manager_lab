function updateButtonStatus(button, success = true, message = '') {
  const defaultText = button.dataset.defaultText || button.textContent;
  const originalColor = button.style.backgroundColor;
  const statusText = message || (success ? '복사 완료!' : '복사 실패');

  button.textContent = statusText;
  button.style.backgroundColor = success ? '#2196F3' : '#f44336';

  setTimeout(() => {
    button.textContent = defaultText;
    button.style.backgroundColor = originalColor;
    button.dataset.defaultText = '';
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

// 줌 참가자 명단 복사 기능 (world: MAIN으로 콘솔과 동일 환경)
document
  .getElementById('copyZoomParticipants')
  .addEventListener('click', () => {
    const button = document.getElementById('copyZoomParticipants');
    const defaultText = button.textContent;
    button.textContent = '작업 중...';
    button.dataset.defaultText = defaultText;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0] && tabs[0].id;
      if (!tabId) {
        updateButtonStatus(button, false, '탭 없음');
        return;
      }

      let finished = false;
      const timeoutId = setTimeout(() => {
        if (!finished) {
          finished = true;
          updateButtonStatus(button, false, '시간 초과');
        }
      }, 30000);

      const handleResults = (results) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          updateButtonStatus(
            button,
            false,
            '스크립트 실패: ' + chrome.runtime.lastError.message
          );
          return;
        }

        // 모든 프레임 결과를 합침
        var allNames = [];
        (results || []).forEach(function (item) {
          var r = item.result || {};
          var names = Array.isArray(r.names) ? r.names : [];
          names.forEach(function (name) {
            if (name && allNames.indexOf(name) === -1) {
              allNames.push(name);
            }
          });
        });

        if (allNames.length > 0) {
          navigator.clipboard
            .writeText(allNames.join('\n'))
            .then(() =>
              updateButtonStatus(button, true, `${allNames.length}명 복사!`)
            )
            .catch(() => updateButtonStatus(button, false, '클립보드 실패'));
        } else {
          updateButtonStatus(button, false, '참가자 없음');
        }
      };

      chrome.scripting.executeScript(
        {
          target: { tabId, allFrames: true },
          world: 'MAIN',
          function: extractZoomParticipants,
        },
        handleResults
      );
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

// 줌 참가자 이름 추출 함수 (웹 버전 줌 - MAIN world에서 실행)
async function extractZoomParticipants() {
  var participants = [];
  var seenPositions = {};

  function collectVisible() {
    var positionEls = document.querySelectorAll('.participants-item-position');
    positionEls.forEach(function (posEl) {
      var top = posEl.style.top;
      if (!top || seenPositions[top]) return;
      var nameEl = posEl.querySelector('[class*="display-name"]');
      if (nameEl) {
        var name = nameEl.textContent.trim();
        if (name) {
          seenPositions[top] = true;
          participants.push(name);
        }
      }
    });
  }

  function delay(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  // 현재 보이는 것 먼저 수집
  collectVisible();

  // 스크롤 컨테이너 찾기
  var scrollContainer =
    document.querySelector('#participants-ul') ||
    document.querySelector('[aria-label="Participants list"]');
  if (
    !scrollContainer ||
    scrollContainer.scrollHeight <= scrollContainer.clientHeight
  ) {
    return {
      names: participants,
      url: document.location.href,
      elCount: participants.length,
    };
  }

  // 스크롤하면서 전체 수집
  var itemHeight = 42;
  var totalHeight = scrollContainer.scrollHeight;
  var viewHeight = scrollContainer.clientHeight;
  // 렌더되는 아이템 수보다 적게 이동해서 누락 방지
  var visibleItems = Math.floor(viewHeight / itemHeight);
  var step = Math.max((visibleItems - 3) * itemHeight, itemHeight * 2);
  var maxScrollTop = Math.max(0, totalHeight - viewHeight);

  scrollContainer.scrollTop = 0;
  scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
  await delay(300);
  collectVisible();

  for (var pos = step; pos <= maxScrollTop; pos += step) {
    scrollContainer.scrollTop = pos;
    scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
    await delay(250);
    collectVisible();
  }

  // 반드시 맨 끝으로 이동해서 마지막 참가자 수집
  scrollContainer.scrollTop = maxScrollTop;
  scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
  await delay(300);
  collectVisible();

  // 혹시 누락된 구간을 위해 한번 더 역방향 스크롤
  for (var pos2 = maxScrollTop - step; pos2 >= 0; pos2 -= step * 2) {
    scrollContainer.scrollTop = Math.max(pos2, 0);
    scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
    await delay(150);
    collectVisible();
  }

  // 스크롤 원래 위치로 복귀
  scrollContainer.scrollTop = 0;
  scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));

  return {
    names: participants,
    url: document.location.href,
    elCount: participants.length,
  };
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
      if (
        text === '입실 완료' ||
        text === '입실(지각)완료' ||
        text === '입실(정상)'
      ) {
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
