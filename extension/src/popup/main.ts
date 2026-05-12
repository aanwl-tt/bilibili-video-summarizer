document.getElementById("open-panel")?.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    chrome.sidePanel.open({ tabId: tabId as number } as chrome.sidePanel.OpenOptions).catch(() => {});
  });
});
