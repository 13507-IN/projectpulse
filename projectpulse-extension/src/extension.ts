import * as vscode from 'vscode';
import { AuthService } from './services/authService';
import { TaskService } from './services/taskService';
import { GitHubService } from './services/githubService';
import { TaskProvider } from './providers/taskProvider';
import { AuthProvider } from './providers/authProvider';

let authService: AuthService;
let taskService: TaskService;
let githubService: GitHubService;
let taskProvider: TaskProvider;
let authProvider: AuthProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('ProjectPulse extension is now active!');

    // Initialize services
    authService = new AuthService(context);
    taskService = new TaskService();
    githubService = new GitHubService();

    // Initialize providers
    taskProvider = new TaskProvider(taskService, githubService);
    authProvider = new AuthProvider(authService);

    // Register tree data providers
    vscode.window.registerTreeDataProvider('projectpulseTasks', taskProvider);
    vscode.window.registerTreeDataProvider('projectpulseAuth', authProvider);

    // Set initial authentication context
    updateAuthenticationContext();

    // Register commands
    const commands = [
        vscode.commands.registerCommand('projectpulse.login', async () => {
            try {
                const success = await authService.login();
                if (success) {
                    vscode.window.showInformationMessage('Successfully logged in to ProjectPulse!');
                    updateAuthenticationContext();
                    taskProvider.refresh();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Login failed: ${error}`);
            }
        }),

        vscode.commands.registerCommand('projectpulse.logout', async () => {
            try {
                await authService.logout();
                vscode.window.showInformationMessage('Successfully logged out from ProjectPulse');
                updateAuthenticationContext();
                taskProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Logout failed: ${error}`);
            }
        }),

        vscode.commands.registerCommand('projectpulse.refreshTasks', () => {
            taskProvider.refresh();
            vscode.window.showInformationMessage('Tasks refreshed');
        }),

        vscode.commands.registerCommand('projectpulse.createTask', async () => {
            const title = await vscode.window.showInputBox({
                prompt: 'Enter task title',
                placeHolder: 'Task title...'
            });

            if (!title) {return;}

            const description = await vscode.window.showInputBox({
                prompt: 'Enter task description (optional)',
                placeHolder: 'Task description...'
            });

            const priority = await vscode.window.showQuickPick(
                ['low', 'medium', 'high'],
                { placeHolder: 'Select priority' }
            );

            if (!priority) {return;}

            try {
                const token = await authService.getToken();
                if (!token) {
                    vscode.window.showErrorMessage('Please login first');
                    return;
                }

                await taskService.createTask({
                    title,
                    description: description || '',
                    priority,
                    status: 'todo'
                }, token);

                taskProvider.refresh();
                vscode.window.showInformationMessage('Task created successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create task: ${error}`);
            }
        }),

        vscode.commands.registerCommand('projectpulse.syncGitHub', async () => {
            try {
                const token = await authService.getToken();
                if (!token) {
                    vscode.window.showErrorMessage('Please login first');
                    return;
                }

                await githubService.syncIssues(token);
                taskProvider.refresh();
                vscode.window.showInformationMessage('GitHub issues synced successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to sync GitHub issues: ${error}`);
            }
        }),

        vscode.commands.registerCommand('projectpulse.openTask', async (task) => {
            if (!task) {return;}
            
            const panel = vscode.window.createWebviewPanel(
                'taskDetails',
                `Task: ${task.title}`,
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = getTaskDetailsWebview(task);

            // Handle messages from webview
            panel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'updateTask':
                        try {
                            const token = await authService.getToken();
                            if (!token) {
                                vscode.window.showErrorMessage('Please login first');
                                return;
                            }

                            await taskService.updateTask(task.id, message.data, token);
                            taskProvider.refresh();
                            vscode.window.showInformationMessage('Task updated successfully!');
                        } catch (error) {
                            vscode.window.showErrorMessage(`Failed to update task: ${error}`);
                        }
                        break;
                }
            });
        })
    ];

    // Add all commands to subscriptions
    commands.forEach(command => context.subscriptions.push(command));

    // Listen for authentication changes
    authService.onAuthChanged(() => {
        updateAuthenticationContext();
        taskProvider.refresh();
        authProvider.refresh();
    });
}

function updateAuthenticationContext() {
    const isAuthenticated = authService.isAuthenticated();
    vscode.commands.executeCommand('setContext', 'projectpulse.authenticated', isAuthenticated);
}

function getTaskDetailsWebview(task: any): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Details</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            .task-header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .task-title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .task-meta {
                display: flex;
                gap: 15px;
                margin-bottom: 10px;
            }
            .meta-item {
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            .task-description {
                margin: 20px 0;
                line-height: 1.6;
            }
            .form-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            input, select, textarea {
                width: 100%;
                padding: 8px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
            }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                margin-right: 10px;
            }
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <div class="task-header">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span class="meta-item">Status: ${task.status}</span>
                <span class="meta-item">Priority: ${task.priority}</span>
                ${task.assignee ? `<span class="meta-item">Assignee: ${task.assignee}</span>` : ''}
            </div>
        </div>

        <div class="task-description">
            <h3>Description</h3>
            <p>${task.description || 'No description provided'}</p>
        </div>

        <form id="taskForm">
            <div class="form-group">
                <label for="status">Status:</label>
                <select id="status" name="status">
                    <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                    <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
                </select>
            </div>

            <div class="form-group">
                <label for="priority">Priority:</label>
                <select id="priority" name="priority">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
            </div>

            <button type="submit">Update Task</button>
        </form>

        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('taskForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                
                vscode.postMessage({
                    command: 'updateTask',
                    data: data
                });
            });
        </script>
    </body>
    </html>
    `;
}

export function deactivate() {}
