import * as vscode from 'vscode';
import { AuthService } from '../services/authService';

export class AuthItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        
        this.contextValue = 'authItem';
    }
}

export class AuthProvider implements vscode.TreeDataProvider<AuthItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AuthItem | undefined | null | void> = new vscode.EventEmitter<AuthItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AuthItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private authService: AuthService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AuthItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: AuthItem): Promise<AuthItem[]> {
        if (!element) {
            const isAuthenticated = await this.authService.verifyToken();
            
            if (isAuthenticated) {
                return [
                    new AuthItem(
                        'Logged in to ProjectPulse',
                        vscode.TreeItemCollapsibleState.None
                    ),
                    new AuthItem(
                        'Logout',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'projectpulse.logout',
                            title: 'Logout'
                        }
                    )
                ];
            } else {
                return [
                    new AuthItem(
                        'Not logged in',
                        vscode.TreeItemCollapsibleState.None
                    ),
                    new AuthItem(
                        'Login with GitHub',
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'projectpulse.login',
                            title: 'Login with GitHub'
                        }
                    )
                ];
            }
        }

        return [];
    }
}
