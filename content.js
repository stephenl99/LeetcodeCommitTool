let justSubmitted = false;
let WAIT_TIME = 500;
let TIMEOUT = 5000; // Increase timeout to 10 seconds
let initialResultText = null; // Track the initial state

function trackSubmitButton() {
  return new Promise((resolve) => {
    // Capture the initial state of any existing result
    const existingResult = document.querySelector('span[data-e2e-locator="submission-result"]');
    initialResultText = existingResult ? existingResult.innerText.trim() : null;
    console.log("Initial result state:", initialResultText);

    const observer = new MutationObserver(() => {
      const submitButton = document.querySelector(
        'button[data-e2e-locator="console-submit-button"]'
      );

      if (submitButton && !submitButton.dataset.listenerAttached) {
        submitButton.addEventListener("click", () => {
          justSubmitted = true;
          console.log("Submit clicked, waiting for submission to start processing...");
          
          // Wait for the submission to actually start processing
          waitForSubmissionToStart();
        });
        submitButton.dataset.listenerAttached = "true";
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function waitForSubmissionToStart() {
    if (!justSubmitted) {
        return;
    }
    
    console.log("Waiting for submission to start...");
    
    // Get the current result text to compare against
    const initialResult = document.querySelector('span[data-e2e-locator="submission-result"]');
    const initialText = initialResult ? initialResult.innerText.trim() : "";
    
    console.log("Initial result before submission:", initialText);
    
    const targetNode = document.body;
    const config = {
        childList: true,
        subtree: true,
    };
    
    const observer = new MutationObserver(() => {
        const resultSpan = document.querySelector('span[data-e2e-locator="submission-result"]');
        
        if (resultSpan) {
            const currentText = resultSpan.innerText.trim();
            
            // Check if the submission has started processing
            // This happens when the text changes from the initial state to something indicating processing
            if (currentText !== initialText && 
                (currentText === "" || 
                 currentText.includes("Running") || 
                 currentText.includes("Judging") ||
                 currentText.includes("Pending") ||
                 currentText.includes("Processing"))) {
                
                console.log("Submission started processing! Current text:", currentText);
                observer.disconnect();
                clearTimeout(startTimeoutId);
                
                // Now wait for the actual result
                waitForAcceptedSubmission();
            }
        }
    });
    
    observer.observe(targetNode, config);
    
    // Timeout for waiting for submission to start
    const startTimeoutId = setTimeout(() => {
        console.log(`Waited ${WAIT_TIME}ms for submission start detection. Now watching for Accepted result...`);
        observer.disconnect();
        
        // Proceed to watch for results
        waitForAcceptedSubmission();
    }, WAIT_TIME);
}

function waitForAcceptedSubmission() {
    if (!justSubmitted) {
        return;
    }
    
    console.log("Now watching for Accepted result...");
    
    const targetNode = document.body;
    const config = {
        childList: true,
        subtree: true,
    };
    
    const observer = new MutationObserver(() => {
        const resultSpan = document.querySelector('span[data-e2e-locator="submission-result"]');
        
        if (resultSpan) {
            const currentText = resultSpan.innerText.trim();
            console.log("Result update:", currentText);
            
            if (currentText === "Accepted") {
                console.log("NEW LeetCode submission was accepted!");
                observer.disconnect();
                clearTimeout(timeoutId);
                justSubmitted = false;
                handleAcceptedSubmission();
            }
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
    const codeMirror = document.querySelector(".monaco-editor");
    
    // Better code extraction for Monaco editor
    let code = "[Unable to extract code]";
    if (codeMirror) {
        // Try to get Monaco editor content
        const monacoTextArea = document.querySelector(".monaco-editor textarea");
        if (monacoTextArea) {
            code = monacoTextArea.value;
        } else {
            // Fallback: try to get from Monaco's text content
            const codeLines = codeMirror.querySelectorAll(".view-line");
            if (codeLines.length > 0) {
                code = Array.from(codeLines).map(line => line.textContent).join("\n");
            }
        }
    }
    
    const lang = document.querySelector("button[data-cy='lang-select']")?.innerText;

    console.log("Problem:", title);
    console.log("Language:", lang);
    console.log("Code:\n", code);

    // TODO: Send this data to background script or GitHub API
}

// Initialize when on a LeetCode problem page
if (window.location.href.includes("leetcode.com/problems/")) {
    trackSubmitButton();
}