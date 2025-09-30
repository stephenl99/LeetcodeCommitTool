function formatProblemId(problemId) {
    // Replace all dashes with spaces and split into words
    return problemId
        .replace(/-/g, " ")  // Replace all dashes with spaces
        .split(" ")          // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))  // Capitalize first letter of each word
        .join(" ");          // Join back with spaces
}

async function apiCall(filename, code, username, token, commitMsg, sha = null) {    
    let url = `https://api.github.com/repos/${username}/${repo}/contents/${filename}`;
    let data = {
        message: commitMsg,
        content: code,
        branch: 'main'
    };
    
    // Add SHA if updating existing file
    if (sha) {
        data.sha = sha;
    }
    
    let options = {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(data),
    };
    
    try {
        const response = await fetch(url, options);
        
        if (response.ok) {
            const result = await response.json();
            console.log(`✅ SUCCESS: File '${filename}' uploaded successfully`);
            console.log('GitHub response:', result);
            return result;
        } else {
            const error = await response.json();
            console.error(`❌ FAILED: Upload failed for '${filename}'`);
            console.error('Status:', response.status);
            console.error('Error:', error);
            return null;
        }
    } catch (error) {
        console.error(`❌ ERROR: Network error uploading '${filename}'`);
        console.error('Error details:', error);
        return null;
    }
}
