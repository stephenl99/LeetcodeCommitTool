let justSubmitted = false;
let TIMEOUT = 500

function trackSubmitButton() {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const submitButton = document.querySelector(
        'button[data-e2e-locator="console-submit-button"]'
      );

      if (submitButton && !submitButton.dataset.listenerAttached) {
        submitButton.addEventListener("click", () => {
          justSubmitted = true;
          console.log("uubSubmit clicked, watching for Accepted...");
          waitForAcceptedSubmission()
        });
        // Avoid duplicate listeners
        submitButton.dataset.listenerAttached = "true";
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function waitForAcceptedSubmission() {
    if (!justSubmitted) {
        return
    }
    const targetNode = document.body;

    const config = {
    childList: true,
    subtree: true,
    };

    const submitTime = Date.now()
    const observer = new MutationObserver(() => {
    const resultSpan = document.querySelector(
        'span[data-e2e-locator="submission-result"]'
    );

    if (resultSpan && resultSpan.innerText.trim() === "Accepted") {
        console.log("LeetCode submission was accepted!");
        observer.disconnect();
        clearTimeout(timeoutId)
        justSubmitted = false
        handleAcceptedSubmission();
    }
    });
    observer.observe(targetNode, config);
    
    const timeoutId = setTimeout(() => {
    console.log("Timed out waiting for Accepted result. Stopping observer.");
    observer.disconnect();
    justSubmitted = false;
    }, TIMEOUT);
}

function handleAcceptedSubmission() {
    const title = document.querySelector("div[data-cy='question-title']")?.innerText;
    const codeMirror = document.querySelector(".monaco-editor"); // Monaco is used for code input

    // You may need to use Monaco API or find the hidden textarea:
    const code = document.querySelector("textarea")?.value || "[Unable to extract code]";
    const lang = document.querySelector("button[data-cy='lang-select']")?.innerText;

    console.log("Problem:", title);
    console.log("Language:", lang);
    console.log("Code:\n", code);

    // TODO: Send this data to background script or GitHub API
}

if (window.location.href.includes("leetcode.com/problems/")) {
    trackSubmitButton()
}