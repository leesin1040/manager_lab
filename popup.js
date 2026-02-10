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

// 줌 참가자 명단 복사 기능
// 핵심: 참가자 목록은 #webclient iframe 안에 있음
// allFrames 대신 메인 프레임에서 iframe.contentDocument로 접근
document
  .getElementById('copyZoomParticipants')
  .addEventListener('click', () => {
    const button = document.getElementById('copyZoomParticipants');
    button.dataset.defaultText = button.textContent;
    button.textContent = '초기화...';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0] && tabs[0].id;
      if (!tabId) {
        updateButtonStatus(button, false, '탭 없음');
        return;
      }

      const seenPositions = {};
      const allNames = [];
      let done = false;

      // 안전 타임아웃 60초
      const safetyTimer = setTimeout(() => {
        if (done) return;
        done = true;
        if (allNames.length > 0) {
          copyResult();
        } else {
          updateButtonStatus(button, false, '시간 초과');
        }
      }, 60000);

      // 메인 프레임에만 동기 함수 실행 (allFrames 사용 안 함)
      function execZoom(fn, callback) {
        chrome.scripting.executeScript(
          {
            target: { tabId },
            world: 'MAIN',
            function: fn,
          },
          (results) => {
            if (chrome.runtime.lastError) {
              callback({ error: chrome.runtime.lastError.message });
              return;
            }
            var r = results && results[0] && results[0].result;
            callback(r || null);
          }
        );
      }

      // 1단계: 초기화
      execZoom(zoomInit, function (initResult) {
        if (done) return;
        if (!initResult || initResult.error || initResult.skip) {
          done = true;
          clearTimeout(safetyTimer);
          var msg = '참가자 없음';
          if (initResult && initResult.error) msg = initResult.error;
          if (initResult && initResult.msg) msg = initResult.msg;
          updateButtonStatus(button, false, msg);
          return;
        }

        button.textContent = '수집 중...';
        setTimeout(doCollectStep, 300);
      });

      // 2단계: 반복 수집
      function doCollectStep() {
        if (done) return;
        execZoom(zoomCollectAndScroll, function (stepResult) {
          if (done) return;
          if (!stepResult || stepResult.skip) {
            finishCollection();
            return;
          }

          (stepResult.items || []).forEach(function (item) {
            if (!seenPositions[item.t]) {
              seenPositions[item.t] = true;
              allNames.push(item.n);
            }
          });

          button.textContent = '수집 중... ' + allNames.length + '명';

          if (stepResult.atBottom) {
            finishCollection();
          } else {
            setTimeout(doCollectStep, 250);
          }
        });
      }

      // 3단계: 마무리
      function finishCollection() {
        if (done) return;
        done = true;
        clearTimeout(safetyTimer);

        execZoom(zoomReset, function () {
          copyResult();
        });
      }

      function copyResult() {
        if (allNames.length > 0) {
          navigator.clipboard
            .writeText(allNames.join('\n'))
            .then(() =>
              updateButtonStatus(button, true, allNames.length + '명 복사!')
            )
            .catch(() =>
              updateButtonStatus(button, false, '클립보드 실패')
            );
        } else {
          updateButtonStatus(button, false, '참가자 없음');
        }
      }
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

// ====== 줌 동기 함수들 ======
// #webclient iframe 내부의 contentDocument에서 참가자 DOM 접근
// allFrames 사용하지 않고, 메인 프레임에서 iframe 직접 접근

// iframe 안의 참가자 문서(doc) 가져오기 헬퍼 (각 함수 내부에 인라인)
// - 먼저 현재 document에서 찾고
// - 없으면 #webclient iframe의 contentDocument에서 찾음

function zoomInit() {
  try {
    // 참가자 컨테이너 찾기: 현재 문서 → iframe 순서
    var doc = document;
    var c = doc.querySelector('.participants-list-container');
    if (!c) {
      var iframe = document.getElementById('webclient');
      if (iframe && iframe.contentDocument) {
        doc = iframe.contentDocument;
        c = doc.querySelector('.participants-list-container');
      }
    }
    if (!c) return { skip: true, msg: 'no-container' };

    c.scrollTop = 0;
    c.dispatchEvent(new Event('scroll', { bubbles: true }));
    return { ok: true };
  } catch (e) {
    return { skip: true, msg: 'init-err:' + e.message };
  }
}

function zoomCollectAndScroll() {
  try {
    var doc = document;
    var c = doc.querySelector('.participants-list-container');
    if (!c) {
      var iframe = document.getElementById('webclient');
      if (iframe && iframe.contentDocument) {
        doc = iframe.contentDocument;
        c = doc.querySelector('.participants-list-container');
      }
    }
    if (!c) return { skip: true };

    // 현재 보이는 참가자 수집
    var items = [];
    var posEls = doc.querySelectorAll('.participants-item-position');
    posEls.forEach(function (posEl) {
      var top = posEl.style.top;
      if (!top) return;
      var nameEl = posEl.querySelector('.participants-item__display-name');
      if (nameEl) {
        var name = nameEl.textContent.trim();
        if (name) items.push({ t: top, n: name });
      }
    });

    // 스크롤 진행
    var maxScroll = c.scrollHeight - c.clientHeight;
    var atBottom = c.scrollTop >= maxScroll - 2;
    if (!atBottom) {
      var step = Math.floor(c.clientHeight * 0.5);
      c.scrollTop = Math.min(c.scrollTop + step, maxScroll);
      c.dispatchEvent(new Event('scroll', { bubbles: true }));
    }

    return { items: items, atBottom: atBottom };
  } catch (e) {
    return { skip: true };
  }
}

function zoomReset() {
  try {
    var doc = document;
    var c = doc.querySelector('.participants-list-container');
    if (!c) {
      var iframe = document.getElementById('webclient');
      if (iframe && iframe.contentDocument) {
        doc = iframe.contentDocument;
        c = doc.querySelector('.participants-list-container');
      }
    }
    if (c) {
      c.scrollTop = 0;
      c.dispatchEvent(new Event('scroll', { bubbles: true }));
    }
    return { ok: true };
  } catch (e) {
    return { ok: false };
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
