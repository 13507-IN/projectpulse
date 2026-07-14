export interface GitHubIssue {
    id: number;
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed';
    labels: Array<{ name: string; color: string }>;
    assignee?: { login: string };
    created_at: string;
    updated_at: string;
}

export class GitHubService {
    private readonly API_BASE_URL = 'http://localhost:4000/api';

    async getRepositories(token: string): Promise<any[]> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/github/repositories`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch repositories: ${response.statusText}`);
            }

            return await response.json() as any[];
        } catch (error) {
            console.error('Error fetching repositories:', error);
            throw error;
        }
    }

    async getIssues(token: string, owner?: string, repo?: string): Promise<GitHubIssue[]> {
        try {
            let url = `${this.API_BASE_URL}/github/issues`;
            if (owner && repo) {
                url += `?owner=${owner}&repo=${repo}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch GitHub issues: ${response.statusText}`);
            }

            return await response.json() as GitHubIssue[];
        } catch (error) {
            console.error('Error fetching GitHub issues:', error);
            throw error;
        }
    }

    async createIssue(token: string, owner: string, repo: string, issueData: {
        title: string;
        body: string;
        labels?: string[];
        assignees?: string[];
    }): Promise<GitHubIssue> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/github/issues`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    owner,
                    repo,
                    ...issueData
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to create GitHub issue: ${response.statusText}`);
            }

            return await response.json() as GitHubIssue;
        } catch (error) {
            console.error('Error creating GitHub issue:', error);
            throw error;
        }
    }

    async updateIssue(token: string, owner: string, repo: string, issueNumber: number, updates: {
        title?: string;
        body?: string;
        state?: 'open' | 'closed';
        labels?: string[];
        assignees?: string[];
    }): Promise<GitHubIssue> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/github/issues/${issueNumber}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    owner,
                    repo,
                    ...updates
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update GitHub issue: ${response.statusText}`);
            }

            return await response.json() as GitHubIssue;
        } catch (error) {
            console.error('Error updating GitHub issue:', error);
            throw error;
        }
    }

    async syncIssues(token: string): Promise<void> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/github/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to sync GitHub issues: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error syncing GitHub issues:', error);
            throw error;
        }
    }

    async getUserProfile(token: string): Promise<any> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/github/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch user profile: ${response.statusText}`);
            }

            return await response.json() as any;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }
}
