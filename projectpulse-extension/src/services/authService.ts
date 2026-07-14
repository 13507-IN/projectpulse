import * as vscode from 'vscode';

export class AuthService {
    private context: vscode.ExtensionContext;
    private readonly API_BASE_URL = 'http://localhost:4000/api';
    private authChangeEmitter = new vscode.EventEmitter<void>();
    public readonly onAuthChanged = this.authChangeEmitter.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async login(): Promise<boolean> {
        try {
            // Open GitHub OAuth URL in browser
            const authUrl = `${this.API_BASE_URL}/auth/github`;
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));

            // Show input box for user to paste the token
            const token = await vscode.window.showInputBox({
                prompt: 'After logging in, paste your access token here',
                placeHolder: 'Access token...',
                password: true
            });

            if (!token) {
                return false;
            }

            // Verify token with backend
            const response = await fetch(`${this.API_BASE_URL}/auth/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                await this.context.secrets.store('projectpulse.token', token);
                this.authChangeEmitter.fire();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }

    async logout(): Promise<void> {
        try {
            await this.context.secrets.delete('projectpulse.token');
            this.authChangeEmitter.fire();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async getToken(): Promise<string | undefined> {
        return await this.context.secrets.get('projectpulse.token');
    }

    isAuthenticated(): boolean {
        // This is a synchronous check, we'll need to verify async
        return this.context.secrets.get('projectpulse.token') !== undefined;
    }

    async verifyToken(): Promise<boolean> {
        const token = await this.getToken();
        if (!token) {return false;}

        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    }
}
