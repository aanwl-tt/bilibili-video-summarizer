document.getElementById("open-panel")?.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId == null) return;
    chrome.sidePanel.open({ tabId }).catch(() => {});
  });
});
