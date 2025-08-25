


const MAX_TOTAL_SIZE = 1 * 1024 * 1024; // 1MB limit for total content
const MAX_FILES_TO_FETCH_LIST = 500; // Limit for the initial file list to avoid huge responses
const MAX_FILES_TO_FETCH_CONTENT = 100; // Limit number of files to fetch content for
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
    // build output
    /\/dist\//,
    /\/build\//,
    /\/out\//,
    /\/public\//,
    // common folders
    /coverage\//,
    /\.next\//,
    /\.nuxt\//,
    /\.svelte-kit\//,
    // lock files
    /\.lock$/,
    // minified files
    /\.min\.js$/,
    /\.min\.css$/,
    // media assets
    /\/assets\//,
    /\/images\//,
    /\/img\//,
    /\/fonts\//,
    /\.png$/, /\.jpe?g$/, /\.gif$/, /\.svg$/, /\.webp$/, /\.mp4$/, /\.webm$/, /\.woff2?$/,
];

interface JsdelivrFile {
    name: string;
    size: number;
}

const parseExcludePatterns = (patterns: string): RegExp[] => {
    return patterns
        .split('\n')
        .map(p => p.trim())
        .filter(p => p && !p.startsWith('#'))
        .map(p => {
            // Convert gitignore-style glob to regex
            const regexString = p
                .replace(/\./g, '\\.') // escape dots
                .replace(/\*/g, '.*')  // handle wildcards
                .replace(/\?/g, '.'); // handle single char wildcard
            return new RegExp(`^${regexString}`);
        });
};

const getRepoPathAndBranch = async (repoUrl: string): Promise<{ repoPath: string; branch: string }> => {
    const urlMatch = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!urlMatch || !urlMatch[1]) {
        throw new Error('Invalid GitHub repository URL. Expected format: https://github.com/owner/repo');
    }
    const repoPath = urlMatch[1].replace(/\.git$/, '');

    const branchesToTry = ['', '@main', '@master'];
    for (const branch of branchesToTry) {
        const apiListUrl = `https://data.jsdelivr.com/v1/package/gh/${repoPath}${branch}/flat`;
        try {
            const response = await fetch(apiListUrl, { method: 'HEAD' });
            if (response.ok) {
                return { repoPath, branch };
            }
        } catch (e) {
            console.warn(`Failed to check branch for ${repoPath}${branch}`, e);
        }
    }
    throw new Error(`Could not resolve default branch for repository. It might be private, non-existent, or use a non-standard default branch (tried default, main, master).`);
};


export async function listGitHubRepoFiles(repoUrl: string, userExcludePatterns: string): Promise<{ path: string; size: number }[]> {
    const { repoPath, branch } = await getRepoPathAndBranch(repoUrl);
    const apiListUrl = `https://data.jsdelivr.com/v1/package/gh/${repoPath}${branch}/flat`;

    const response = await fetch(apiListUrl);
    if (!response.ok) {
        throw new Error(`Failed to list files from repository. Status: ${response.status}`);
    }
    const data = await response.json();
    if (!data || !data.files) {
        throw new Error('Invalid response from file list API.');
    }

    const customIgnores = parseExcludePatterns(userExcludePatterns);

    const files = data.files
        .map((file: JsdelivrFile) => ({ path: file.name, size: file.size }))
        .filter(({ path }: { path: string }) => {
            const normalizedPath = path.substring(1); // remove leading '/'
            if (IGNORED_PATTERNS.some(pattern => pattern.test(normalizedPath))) return false;
            if (customIgnores.some(pattern => pattern.test(normalizedPath))) return false;
            
            const extension = path.split('.').pop()?.toLowerCase() || '';
            const fileName = path.split('/').pop()?.toLowerCase() || '';
            return ALLOWED_EXTENSIONS.has(extension) || ALLOWED_EXTENSIONS.has(fileName);
        })
        .slice(0, MAX_FILES_TO_FETCH_LIST);

    if (files.length === 0) {
        throw new Error('No relevant and readable files were found after applying filters.');
    }
    
    return files;
}

export async function fetchGitHubFilesContent(repoUrl: string, filesToFetch: string[]): Promise<{ content: string, fileCount: number }> {
    if (filesToFetch.length > MAX_FILES_TO_FETCH_CONTENT) {
        throw new Error(`Cannot fetch more than ${MAX_FILES_TO_FETCH_CONTENT} files at once.`);
    }

    const { repoPath, branch } = await getRepoPathAndBranch(repoUrl);
    
    let totalSize = 0;
    let combinedContent = '';
    let fetchedFiles = 0;
    
    for (const filePath of filesToFetch) {
        if (totalSize > MAX_TOTAL_SIZE) {
            console.warn(`Max content size of ${MAX_TOTAL_SIZE} bytes reached. Halting fetch.`);
            combinedContent += `\n\n// --- [INFO] Maximum content size reached. Not all selected files were included. ---`;
            break;
        }

        const fileContentUrl = `https://cdn.jsdelivr.net/gh/${repoPath}${branch}${filePath}`;
        try {
            const fileResponse = await fetch(fileContentUrl);
            if (fileResponse.ok) {
                const fileContent = await fileResponse.text();

                 if (totalSize + fileContent.length > MAX_TOTAL_SIZE) {
                    console.warn(`Skipping ${filePath} as it would exceed the total size limit.`);
                    continue; 
                }

                combinedContent += `\n\n// --- FILE: ${filePath.substring(1)} ---\n${fileContent}`;
                totalSize += fileContent.length;
                fetchedFiles++;
            }
        } catch (e) {
            console.warn(`Could not fetch file content: ${filePath}`, e);
        }
    }

    if (fetchedFiles === 0 && filesToFetch.length > 0) {
        throw new Error('None of the selected files could be fetched.');
    }
    
    return { content: combinedContent.trim(), fileCount: fetchedFiles };
}