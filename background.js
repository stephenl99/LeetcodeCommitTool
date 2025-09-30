// Background script for GitHub API calls
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'uploadToGitHub') {
        handleGitHubUpload(request.data)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }
});

async function handleGitHubUpload(data) {
    const { filename, code, username, token, commitMsg, sha } = data;
    
    let url = `https://api.github.com/repos/${username}/Leetcode/contents/${filename}`;
    let requestData = {
        message: commitMsg,
        content: code,
        branch: 'main'
    };
    
    if (sha) {
        requestData.sha = sha;
    }
    
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    });
    
    if (response.ok) {
        const result = await response.json();
        return result;
    } else {
        const error = await response.json();
        throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(error)}`);
    }
}
