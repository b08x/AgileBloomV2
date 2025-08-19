

const MAX_TOTAL_SIZE = 1 * 1024 * 1024; // 1MB limit for total content
const MAX_FILES_TO_FETCH = 100; // Limit number of files to avoid too many requests
const ALLOWED_EXTENSIONS = new Set([
    // Code
    'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'cs', 'go', 'php', 'html', 'css', 'scss', 'less', 'vue', 'svelte', 'sh', 'bash',
    // Config
    'json', 'yaml', 'yml', 'xml', 'toml', 'ini', 'env',
    // Docs
    'md', 'txt', 'rst',
    // Other
    'dockerfile', 'gitignore', 'npmrc', 'lock', 'mod', 'sum', 'gradle', 'properties', 'config'
]);
const IGNORED_PATTERNS = [
    /node_modules\//,
    /\.git\//,
    /dist\//,
    /build\//,
    /coverage\//,
    /\.lock$/,
    /\.min\.js$/,
    /\.min\.css$/,
    /\/assets\//,
    /\/images\//,
    /\/img\//,
    /\/fonts\//,
];

interface JsdelivrFile {
    name: string;
}

export async function fetchGitHubRepoContents(repoUrl: string): Promise<{ content: string, fileCount: number }> {
    const urlMatch = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!urlMatch || !urlMatch[1]) {
        throw new Error('Invalid GitHub repository URL. Expected format: https://github.com/owner/repo');
    }
    const repoPath = urlMatch[1].replace(/\.git$/, '');

    // The jsdelivr API can sometimes fail to resolve the default branch.
    // We will try fetching the file list from the default branch, then fallback to 'main' and 'master'.
    const branchesToTry = ['', '@main', '@master']; // '' means default
    let data;
    let successfulBranch = '';

    for (const branch of branchesToTry) {
        const apiListUrl = `https://data.jsdelivr.com/v1/package/gh/${repoPath}${branch}/flat`;
        try {
            const response = await fetch(apiListUrl);
            if (response.ok) {
                const responseData = await response.json();
                // Ensure there are files to process
                if (responseData && responseData.files && responseData.files.length > 0) {
                    data = responseData;
                    successfulBranch = branch;
                    break; // Success, exit loop
                }
            }
        } catch (e) {
            // Ignore fetch errors and try the next branch
            console.warn(`Failed to fetch file list from ${apiListUrl}`, e);
        }
    }

    if (!data) {
        throw new Error(`Could not list files for repository. It might be private, non-existent, or use a non-standard default branch (tried default, main, master).`);
    }
    
    let totalSize = 0;
    let combinedContent = '';
    let fetchedFiles = 0;

    const filesToFetch = data.files
      .map((file: JsdelivrFile) => file.name)
      .filter((path: string) => {
          if (IGNORED_PATTERNS.some(pattern => pattern.test(path))) {
              return false;
          }
          const extension = path.split('.').pop()?.toLowerCase() || '';
          const fileName = path.split('/').pop()?.toLowerCase() || '';
          // Handle files with extensions and specific filenames like 'Dockerfile'
          return ALLOWED_EXTENSIONS.has(extension) || ALLOWED_EXTENSIONS.has(fileName);
      })
      .slice(0, MAX_FILES_TO_FETCH);

    for (const filePath of filesToFetch) {
        if (totalSize > MAX_TOTAL_SIZE) {
            console.warn(`Max content size of ${MAX_TOTAL_SIZE} bytes reached. Halting fetch.`);
            combinedContent += `\n\n// --- [INFO] Maximum content size reached. Not all files were included. ---`;
            break;
        }

        const fileContentUrl = `https://cdn.jsdelivr.net/gh/${repoPath}${successfulBranch}${filePath}`;
        try {
            const fileResponse = await fetch(fileContentUrl);
            if (fileResponse.ok) {
                const fileContent = await fileResponse.text();

                if (totalSize + fileContent.length > MAX_TOTAL_SIZE) {
                    continue; // Skip if adding it exceeds limit
                }

                combinedContent += `\n\n// --- FILE: ${filePath.substring(1)} ---\n${fileContent}`;
                totalSize += fileContent.length;
                fetchedFiles++;
            }
        } catch (e) {
            console.warn(`Could not fetch file: ${filePath}`, e);
        }
    }
    
    if (fetchedFiles === 0) {
        throw new Error('No relevant and readable files were found in the repository. Check file extensions and repository structure.');
    }
    
    if (data.files.length > MAX_FILES_TO_FETCH) {
        combinedContent += `\n\n// --- [INFO] Repository has more than ${MAX_FILES_TO_FETCH} files. Only a subset was included. ---`;
    }

    return { content: combinedContent.trim(), fileCount: fetchedFiles };
}