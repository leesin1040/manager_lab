// background.js: 서비스 워커에서 탭 이벤트를 처리하거나 메시지 수신
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// 액션 버튼 클릭 시 content.js 실행
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
  }
});
