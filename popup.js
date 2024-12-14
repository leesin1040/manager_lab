document.getElementById('runScript').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: extractAllNamesAndCopyToClipboard,
    });
  });
  window.close();
});

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
