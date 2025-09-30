let justSubmitted = false;
let WAIT_TIME = 500;
let TIMEOUT = 5000; // Increase timeout to 10 seconds
let initialResultText = null; // Track the initial state
let problemNumber = null;

let gitHubUsername = null;
let repo = null;
let gitHubToken = null;

function getFileExtension(language) {
    const extensions = {
        'Java': 'java',
        'Python': 'py',
        'Python3': 'py',
        'C++': 'cpp',
        'C': 'c',
        'JavaScript': 'js',
        'TypeScript': 'ts',
        'Go': 'go',
        'Ruby': 'rb',
        'Swift': 'swift',
        'Kotlin': 'kt',
        'Rust': 'rs',
        'PHP': 'php',
        'C#': 'cs',
        'Scala': 'scala',
        'Dart': 'dart',
        'Elixir': 'ex',
        'Erlang': 'erl'
    };
    return extensions[language] || 'txt';
}

function isExtensionContextValid() {
    try {
        return chrome.runtime && chrome.runtime.id;
    } catch (error) {
        return false;
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function loadCredentials() {
    return new Promise((resolve) => {
        if (!isExtensionContextValid()) {
            console.error('❌ Extension context invalidated. Please reload the page.');
            resolve(false);
            return;
        }
        
        try {
            chrome.storage.sync.get(['githubUsername', 'githubRepo', 'githubToken'], function(result) {
                if (chrome.runtime.lastError) {
                    console.error('❌ Extension context error loading credentials:', chrome.runtime.lastError.message);
                    console.log('Please reload the page and try again.');
                    resolve(false);
                    return;
                }
                
                if (result.githubUsername && result.githubToken) {
                    gitHubUsername = result.githubUsername;
                    repo = result.githubRepo || 'Leetcode';
                    gitHubToken = result.githubToken;
                    console.log('Credentials loaded successfully');
                    resolve(true);
                } else {
                    console.log('No credentials found. Please set up your GitHub credentials in the extension popup.');
                    resolve(false);
                }
            });
        } catch (error) {
            console.error('❌ Error accessing Chrome storage:', error.message);
            console.log('Extension may need to be reloaded. Please refresh the page.');
            resolve(false);
        }
    });
}


function updateProblemNumber() {
    const titleElement = document.querySelector("a.no-underline.hover\\:text-blue-s");
    const title = titleElement?.innerText;
    const newProblemNumber = title ? title.split('.')[0].trim() : null;
    
    if (newProblemNumber !== problemNumber) {
        problemNumber = newProblemNumber;
        console.log("Problem Number updated:", problemNumber);
    }
}

function startProblemNumberMonitor() {
    // Update immediately
    updateProblemNumber();
    
    // Set up observer to watch for changes in the problem title
    const observer = new MutationObserver(() => {
        updateProblemNumber();
    });
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
    
    // Also check periodically as a backup
    setInterval(updateProblemNumber, 1000);
}

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
            if (currentText !== initialText) {
                
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

async function handleAcceptedSubmission() {
    // Check if credentials are loaded
    if (!gitHubUsername || !gitHubToken) {
        const hasCredentials = await loadCredentials();
        if (!hasCredentials) {
            console.log('❌ No GitHub credentials found. Please set up your credentials in the extension popup.');
            return;
        }
    }
    
    const url = window.location.href;
    const splitUrl = url.split("/");
    const problemId = formatProblemId(splitUrl[4]);
    console.log("Problem ID:", problemId);
    
    const codeMirror = document.querySelector(".monaco-editor");
    
    // Better code extraction for Monaco editor
    let code = "[Unable to extract code]";
    if (codeMirror) {
        // Get all code elements and extract text content
        const codeElements = document.getElementsByTagName('code');
        if (codeElements.length > 0) {
            code = codeElements[codeElements.length - 1].textContent || codeElements[codeElements.length - 1].innerText;
            console.log("Extracted from code tags:", code.length, "characters");
        }
    }
    
    // Find the language selector button (contains language name + chevron icon)
    let langButton = document.querySelector("button[aria-haspopup='dialog'][class*='rounded'][class*='items-center']");
    let lang = langButton?.innerText?.replace(/\s*$/, '') || null; // Remove trailing whitespace/icons

    console.log("Problem:", problemId);
    console.log("Problem Number:", problemNumber);
    console.log("Language:", lang);
    console.log("Code:\n", code);

    let commitMsg = `Add LeetCode solution: ${problemNumber}. ${problemId}`;
    let sha = null;
    
    // Create filename - handle null problemNumber
    const safeProblemNumber = problemNumber || 'unknown';
    const filename = `${safeProblemNumber}-${problemId.toLowerCase().replace(/\s+/g, '-')}.${getFileExtension(lang)}`;

    // Convert code to base64 for GitHub API
    const base64Code = btoa(unescape(encodeURIComponent(code)));
    console.log("Base64 encoded:", base64Code);

    // Get existing file SHA if it exists
    try {
        console.log('Checking for existing file:', filename);
        const response = await fetch(`https://api.github.com/repos/${gitHubUsername}/${repo}/contents/${filename}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${gitHubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        console.log('GET response status:', response.status);
        
        if (response.ok) {
            const fileData = await response.json();
            sha = fileData.sha;
            console.log('Found existing file, SHA:', sha);
            
            // Ask user if they want to overwrite existing solution
            const shouldOverwrite = confirm(
                `🔄 Overwrite Existing Solution?\n\n` +
                `A solution for "${problemId}" already exists in your GitHub repository.\n\n` +
                `Do you want to overwrite it with your new submission?\n\n` +
                `✅ Click OK to overwrite\n` +
                `❌ Click Cancel to skip`
            );
            
            if (!shouldOverwrite) {
                console.log('User chose not to overwrite existing solution. Skipping upload.');
                showNotification('⏭️ Skipped upload - existing solution preserved', 'info');
                return;
            }
            
            showNotification('🔄 Overwriting existing solution...', 'info');
        } else if (response.status === 404) {
            console.log('File does not exist (404), creating new file');
            showNotification('📝 Creating new solution file...', 'info');
        } else {
            console.log('Unexpected response status:', response.status);
        }
        
        // Send to background script to avoid CORS
        if (!isExtensionContextValid()) {
            console.error('❌ Extension context invalidated. Please reload the page and try again.');
            return;
        }
        
        try {
            chrome.runtime.sendMessage({
                action: 'uploadToGitHub',
                data: {
                    filename: filename,
                    code: base64Code,
                    username: gitHubUsername,
                    token: gitHubToken,
                    commitMsg: commitMsg,
                    sha: sha
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Extension context error:', chrome.runtime.lastError.message);
                    console.log('Please reload the page and try again.');
                    return;
                }
                
                if (response && response.success) {
                    console.log('✅ GitHub upload successful:', response.result);
                    showNotification('✅ Solution saved to GitHub successfully!', 'success');
                } else if (response) {
                    console.error('❌ GitHub upload failed:', response.error);
                    showNotification('❌ Failed to save solution to GitHub', 'error');
                } else {
                    console.error('❌ No response from background script');
                    showNotification('❌ No response from extension', 'error');
                }
            });
        } catch (runtimeError) {
            console.error('❌ Runtime error:', runtimeError.message);
            console.log('Extension may need to be reloaded. Please refresh the page.');
        }
    } catch (error) {
        console.log('Error getting SHA:', error);
    }


}

// Initialize when on a LeetCode problem page
if (window.location.href.includes("leetcode.com/problems/")) {
    // Load credentials on startup
    loadCredentials().then((hasCredentials) => {
        if (hasCredentials) {
            console.log('✅ Extension ready with GitHub credentials');
        } else {
            console.log('⚠️ Extension loaded but no GitHub credentials found');
        }
    });
    
    startProblemNumberMonitor();
    trackSubmitButton();
}