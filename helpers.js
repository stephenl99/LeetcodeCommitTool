function formatProblemId(problemId) {
    // Replace all dashes with spaces and split into words
    return problemId
        .replace(/-/g, " ")  // Replace all dashes with spaces
        .split(" ")          // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))  // Capitalize first letter of each word
        .join(" ");          // Join back with spaces
}