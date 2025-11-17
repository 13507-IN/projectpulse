import axios from "axios";

/**
 * Exchange GitHub OAuth code for an access token
 * @param {string} code - The authorization code from GitHub
 * @returns {Promise<string>} The GitHub access token
 * @throws {Error} If the token exchange fails
 */
export const getGitHubAccessToken = async (code) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 10);
    
    try {
        // Input validation
        if (!code || typeof code !== 'string') {
            throw new Error('Invalid or missing authorization code');
        }

        // Log environment status (without exposing secrets)
        console.log(`🔑 [${requestId}] Starting GitHub OAuth token exchange`, {
            hasClientId: !!process.env.GITHUB_CLIENT_ID,
            hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
            callbackUrl: process.env.GITHUB_CALLBACK_URL ? 'configured' : 'missing',
            codeLength: code.length
        });

        // Validate required configuration
        if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
            throw new Error('GitHub OAuth client credentials not configured');
        }

        // Prepare token request
        const tokenUrl = 'https://github.com/login/oauth/access_token';
        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
            redirect_uri: process.env.GITHUB_CALLBACK_URL || ''
        });

        console.log(`🔍 [${requestId}] Requesting token from GitHub...`);
        
        // Make the token request
        const response = await axios({
            method: 'POST',
            url: tokenUrl,
            data: params,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ProjectPulse-Server',
                'X-GitHub-Request-Id': requestId
            },
            timeout: 10000, // 10 second timeout
            maxRedirects: 0,
            validateStatus: (status) => status < 500 // Don't throw for 4xx errors
        });

        const responseTime = Date.now() - startTime;
        
        // Log the response (without exposing sensitive data)
        console.log(`✅ [${requestId}] GitHub token response (${responseTime}ms)`, {
            status: response.status,
            hasData: !!response.data,
            error: response.data?.error || 'none',
            errorDescription: response.data?.error_description ? response.data.error_description.substring(0, 100) + '...' : 'none',
            hasAccessToken: !!response.data?.access_token,
            scope: response.data?.scope || 'none'
        });
        
        // Handle GitHub API errors
        if (response.data?.error) {
            const errorMessage = response.data.error_description || response.data.error;
            if (response.data.error === 'bad_verification_code') {
                throw new Error(`Invalid or expired authorization code: ${errorMessage}`);
            } else if (response.data.error === 'incorrect_client_credentials') {
                throw new Error('GitHub OAuth credentials are invalid. Please check your GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.');
            } else {
                throw new Error(`GitHub OAuth error: ${errorMessage}`);
            }
        }
        
        // Validate the response
        if (!response.data?.access_token) {
            throw new Error('No access token received from GitHub');
        }

        return response.data.access_token;
        
    } catch (error) {
        const errorTime = Date.now() - startTime;
        const errorContext = {
            requestId,
            duration: errorTime,
            message: error.message,
            code: error.code,
            stack: error.stack?.split('\n')[0], // Just first line of stack
        };

        // Add response details if available
        if (error.response) {
            errorContext.response = {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers,
                data: error.response.data ? '...' : 'none'
            };
            
            // Log the full error in development for debugging
            if (process.env.NODE_ENV === 'development') {
                console.error('Full error response:', error.response.data);
            }
        } else if (error.request) {
            errorContext.requestError = 'No response received from GitHub';
        }

        console.error(`❌ [${requestId}] GitHub token exchange failed after ${errorTime}ms`, errorContext);
        
        // Re-throw with a user-friendly message
        if (error.message.includes('timeout')) {
            throw new Error('Connection to GitHub timed out. Please check your internet connection and try again.');
        } else if (error.message.includes('ENOTFOUND')) {
            throw new Error('Could not connect to GitHub. Please check your internet connection.');
        }
        
        throw error; // Re-throw the original error
    }
};

/**
 * Fetch GitHub user profile using the access token
 * @param {string} accessToken - GitHub OAuth access token
 * @returns {Promise<Object>} GitHub user profile data
 */
export const getGitHubUser = async (accessToken) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 8);
    
    try {
        if (!accessToken) {
            throw new Error('No access token provided');
        }

        console.log(`👤 [${requestId}] Fetching GitHub user profile...`);
        
        const response = await axios.get('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'ProjectPulse-App',
                'X-Request-Id': requestId
            },
            timeout: 8000,
            validateStatus: (status) => status < 500
        });

        const responseTime = Date.now() - startTime;
        
        if (response.status === 401) {
            throw new Error('Invalid or expired access token');
        }
        
        if (response.status !== 200) {
            throw new Error(`GitHub API returned status ${response.status}`);
        }
        
        const userData = response.data;
        
        console.log(`✅ [${requestId}] Fetched GitHub user in ${responseTime}ms`, {
            userId: userData.id,
            login: userData.login,
            name: userData.name || 'not provided',
            email: userData.email ? 'provided' : 'not provided',
            publicRepos: userData.public_repos || 0
        });
        
        return userData;
        
    } catch (error) {
        const errorTime = Date.now() - startTime;
        const errorInfo = {
            requestId,
            duration: errorTime,
            message: error.message,
            code: error.code
        };
        
        if (error.response) {
            errorInfo.status = error.response.status;
            errorInfo.statusText = error.response.statusText;
            
            // Log rate limit information if available
            if (error.response.status === 403 && 
                error.response.headers['x-ratelimit-remaining'] === '0') {
                const resetTime = new Date(parseInt(error.response.headers['x-ratelimit-reset']) * 1000);
                errorInfo.rateLimit = {
                    limit: error.response.headers['x-ratelimit-limit'],
                    remaining: error.response.headers['x-ratelimit-remaining'],
                    reset: resetTime.toISOString()
                };
            }
        }
        
        console.error(`❌ [${requestId}] Failed to fetch GitHub user after ${errorTime}ms`, errorInfo);
        
        // Provide more user-friendly error messages
        if (error.message.includes('401')) {
            throw new Error('Your GitHub session has expired. Please log in again.');
        } else if (error.message.includes('403') && errorInfo.rateLimit) {
            throw new Error('GitHub API rate limit exceeded. Please try again later.');
        } else if (error.message.includes('timeout')) {
            throw new Error('Connection to GitHub timed out. Please try again.');
        }
        
        throw new Error('Failed to fetch your GitHub profile. Please try again.');
    }
};

export const getGitHubRepositories = async (accessToken) => {
    try {
        const response = await axios.get("https://api.github.com/user/repos", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "ProjectPulse-App",
                "Accept": "application/vnd.github.v3+json"
            },
            params: {
                sort: "updated",
                direction: "desc",
                per_page: 30, // Limit to 30 most recent repos for better performance
                type: "owner"
            }
        });

        // Filter out forked and archived repos, and map to include only necessary fields
        return response.data
            .filter(repo => !repo.fork && !repo.archived)
            .map(repo => ({
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                html_url: repo.html_url,
                description: repo.description,
                language: repo.language,
                updated_at: repo.updated_at,
                created_at: repo.created_at,
                owner: {
                    login: repo.owner.login,
                    avatar_url: repo.owner.avatar_url,
                    html_url: repo.owner.html_url
                },
                private: repo.private,
                fork: repo.fork,
                stargazers_count: repo.stargazers_count,
                forks_count: repo.forks_count,
                open_issues_count: repo.open_issues_count,
                default_branch: repo.default_branch,
                clone_url: repo.clone_url,
                ssh_url: repo.ssh_url
            }));
    } catch (error) {
        console.error("Error fetching GitHub repos:", error.response?.data || error.message);
        throw new Error("Failed to fetch GitHub repositories. Please ensure your GitHub token has the necessary permissions.");
    }
};

export const getGitHubIssues = async (accessToken) => {
    try {
        const response = await axios.get("https://api.github.com/issues", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "ProjectPulse-App"
            },
            params: {
                filter: "assigned",
                state: "open",
                sort: "updated",
                per_page: 50
            }
        });

        return response.data.map(issue => ({
            ...issue,
            repository: issue.repository_url.split('/').slice(-2).join('/')
        }));
    } catch (error) {
        console.error("Error fetching GitHub issues:", error.message);
        throw new Error("Failed to fetch GitHub issues");
    }
};

export const createGitHubIssue = async (accessToken, repository, title, body, labels = []) => {
    try {
        const response = await axios.post(`https://api.github.com/repos/${repository}/issues`, {
            title,
            body,
            labels
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "ProjectPulse-App"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error creating GitHub issue:", error.message);
        throw new Error("Failed to create GitHub issue");
    }
};

export const updateGitHubIssue = async (accessToken, repository, issueNumber, updates) => {
    try {
        const response = await axios.patch(`https://api.github.com/repos/${repository}/issues/${issueNumber}`, updates, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "ProjectPulse-App"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error updating GitHub issue:", error.message);
        throw new Error("Failed to update GitHub issue");
    }
};
